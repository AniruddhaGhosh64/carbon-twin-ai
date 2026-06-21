from typing import Optional, List, Callable, cast
from app.schemas.assessment import (
    AssessmentCreateRequest, 
    CommuteMethod, 
    VehicleType, 
    FoodHabit,
    SolarSetupTier,
    FoodCategory,
    ClothingItemsSchema,
    DailyDistances,
    WeeklyOverride,
    WeekTracking,
    TransportationSchema,
    HomeEnergySchema,
    FoodHabitsSchema,
    ShoppingSchema
)
from app.services.carbon_service import CarbonCalculationService
from app.schemas.twin import TwinState, TwinRecommendationItem, TwinProfile
from copy import deepcopy
from app.core.constants import (
    BICYCLE_SWITCH_THRESHOLD_KM,
    BICYCLE_SAVINGS_PER_KM,
    TRANSIT_SAVINGS_PER_KM,
    FLIGHT_SAVINGS_PER_FLIGHT,
    ELECTRICITY_BILL_REDUCTION_FACTOR,
    INR_TO_USD_CONVERSION_FACTOR,
    ANNUAL_SOLAR_SAVINGS_USD,
    DIET_REDUCTION_FACTOR,
    DIET_REDUCTION_SAVINGS_USD,
    DIET_HIGH_MEAT_SHIFT_SAVINGS_USD,
    DIET_MIXED_SHIFT_SAVINGS_USD,
    FOOD_DELIVERY_REDUCTION_COUNT,
    FOOD_DELIVERY_FEE_SAVINGS_USD,
    PACKAGE_DELIVERY_REDUCTION_COUNT,
    PACKAGE_DELIVERY_FEE_SAVINGS_USD,
    CLOTHING_REDUCTION_FACTOR,
    CLOTHING_ITEM_COSTS,
    CLOTHING_SPEND_REDUCTION_RATE,
    MONTHS_IN_YEAR,
    FREQUENT_FLYER_FLIGHTS,
    FREQUENT_FLYER_EMISSIONS_KG,
    HIGH_CONSUMER_SHOPPING_KG,
    HIGH_CONSUMER_DELIVERIES,
    HIGH_CONSUMER_CLOTHING_ITEMS,
    URBAN_OPTIMIZER_RATIO,
    ENERGY_EFFICIENT_ENERGY_KG,
    ENERGY_EFFICIENT_RENEWABLE_PCT
)

class CarbonTwinService:
    @staticmethod
    def apply_transit_rule(assessment: AssessmentCreateRequest) -> tuple[AssessmentCreateRequest, float]:
        """Switch car commute to bicycle/public transit and estimate fuel cost savings."""
        res = deepcopy(assessment)
        commute = res.transportation.commute_method
        dist = res.transportation.weekly_distance_km or 0.0
        money_saved = 0.0

        # Determine distance
        dists = res.transportation.get_mode_distances()
        car_dist = dists["car"]

        if car_dist > 0:
            if car_dist < BICYCLE_SWITCH_THRESHOLD_KM:
                # Switch to bicycle
                if res.transportation.weekly_override.is_active:
                    res.transportation.weekly_override.bicycle += car_dist
                    res.transportation.weekly_override.car = 0.0
                else:
                    for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
                        daily = getattr(res.transportation.current_week, day)
                        daily.bicycle += daily.car
                        daily.car = 0.0
                money_saved = car_dist * 52 * BICYCLE_SAVINGS_PER_KM
            else:
                # Switch to public transit
                if res.transportation.weekly_override.is_active:
                    res.transportation.weekly_override.public_transit += car_dist
                    res.transportation.weekly_override.car = 0.0
                else:
                    for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
                        daily = getattr(res.transportation.current_week, day)
                        daily.public_transit += daily.car
                        daily.car = 0.0
                money_saved = car_dist * 52 * TRANSIT_SAVINGS_PER_KM

            res.transportation.vehicle_type = VehicleType.NONE
            res.transportation = TransportationSchema(**res.transportation.model_dump())

        return res, money_saved

    @staticmethod
    def apply_flights_rule(assessment: AssessmentCreateRequest) -> tuple[AssessmentCreateRequest, float]:
        """Reduce flights by 50% and estimate cash savings."""
        res = deepcopy(assessment)
        records = res.transportation.flight_records
        money_saved = 0.0
        if records:
            # Keep only 50% of the flights
            kept_count = (len(records) + 1) // 2
            removed_count = len(records) - kept_count
            res.transportation.flight_records = records[:kept_count]
            res.transportation = TransportationSchema(**res.transportation.model_dump())
            money_saved = removed_count * FLIGHT_SAVINGS_PER_FLIGHT
        return res, money_saved

    @staticmethod
    def apply_energy_rule(assessment: AssessmentCreateRequest) -> tuple[AssessmentCreateRequest, float]:
        """Reduce electricity usage by 20% and install solar panels."""
        res = deepcopy(assessment)
        money_saved = 0.0

        # Reduce electricity bill by 20%
        bill = res.home_energy.monthly_electricity_bill_inr
        if bill > 0:
            res.home_energy.monthly_electricity_bill_inr = bill * ELECTRICITY_BILL_REDUCTION_FACTOR
            # Savings scaled annually and converted to USD
            money_saved += (bill * (1.0 - ELECTRICITY_BILL_REDUCTION_FACTOR) * MONTHS_IN_YEAR) / INR_TO_USD_CONVERSION_FACTOR

        # Upgrade solar tier to MEDIUM if NONE or SMALL
        tier = res.home_energy.solar_tier
        if tier in [SolarSetupTier.NONE, SolarSetupTier.SMALL]:
            res.home_energy.solar_tier = SolarSetupTier.MEDIUM
            # Installing solar panels saves money on utility bills
            money_saved += ANNUAL_SOLAR_SAVINGS_USD

        res.home_energy = HomeEnergySchema(**res.home_energy.model_dump())
        return res, money_saved

    @staticmethod
    def apply_diet_rule(assessment: AssessmentCreateRequest) -> tuple[AssessmentCreateRequest, float]:
        """Reduce meat consumption (specifically beef, poultry, fish) by 50% in meals."""
        res = deepcopy(assessment)
        money_saved = 0.0
        has_meat = False

        for meal in res.food_habits.meals:
            for item in meal.items:
                if item.category in [FoodCategory.BEEF, FoodCategory.POULTRY, FoodCategory.FISH]:
                    # Halve portion size
                    saved_portion = item.portion_g * DIET_REDUCTION_FACTOR
                    item.portion_g *= DIET_REDUCTION_FACTOR
                    has_meat = True
                    # Shift saved portion to plant protein
                    protein_item = next((x for x in meal.items if x.category == FoodCategory.PLANT_PROTEIN), None)
                    if protein_item:
                        protein_item.portion_g += saved_portion
                    else:
                        meal.items.append(deepcopy(item))
                        new_item = meal.items[-1]
                        new_item.id = f"{item.id}_sub"
                        new_item.name = "Plant Protein Alternative"
                        new_item.category = FoodCategory.PLANT_PROTEIN
                        new_item.portion_g = saved_portion

        if has_meat:
            money_saved = DIET_REDUCTION_SAVINGS_USD
        else:
            # Fallback if no meals logged
            diet = res.food_habits.diet_type
            if diet == FoodHabit.HIGH_MEAT:
                res.food_habits.diet_type = FoodHabit.MIXED
                money_saved = DIET_HIGH_MEAT_SHIFT_SAVINGS_USD
            elif diet == FoodHabit.MIXED:
                res.food_habits.diet_type = FoodHabit.VEGETARIAN
                money_saved = DIET_MIXED_SHIFT_SAVINGS_USD

        res.food_habits = FoodHabitsSchema(**res.food_habits.model_dump())
        return res, money_saved

    @staticmethod
    def apply_delivery_rule(assessment: AssessmentCreateRequest) -> tuple[AssessmentCreateRequest, float]:
        """Reduce food/package deliveries by 50% and discretionary clothing shopping by 15%."""
        res = deepcopy(assessment)
        money_saved = 0.0

        # Reduce deliveries
        fd = res.shopping.food_deliveries_per_week
        if fd > 0:
            res.shopping.food_deliveries_per_week = max(0, fd - FOOD_DELIVERY_REDUCTION_COUNT)
            money_saved += (fd - res.shopping.food_deliveries_per_week) * 52 * FOOD_DELIVERY_FEE_SAVINGS_USD

        pd = res.shopping.package_deliveries_per_week
        if pd > 0:
            res.shopping.package_deliveries_per_week = max(0, pd - PACKAGE_DELIVERY_REDUCTION_COUNT)
            money_saved += (pd - res.shopping.package_deliveries_per_week) * 52 * PACKAGE_DELIVERY_FEE_SAVINGS_USD

        # Reduce clothing purchases
        res.shopping.clothing_items.shirts = round(res.shopping.clothing_items.shirts * CLOTHING_REDUCTION_FACTOR)
        res.shopping.clothing_items.pants = round(res.shopping.clothing_items.pants * CLOTHING_REDUCTION_FACTOR)
        res.shopping.clothing_items.outerwear = round(res.shopping.clothing_items.outerwear * CLOTHING_REDUCTION_FACTOR)
        res.shopping.clothing_items.shoes = round(res.shopping.clothing_items.shoes * CLOTHING_REDUCTION_FACTOR)
        
        # Estimate shopping spend reduction
        clothing_spend_annual = (
            assessment.shopping.clothing_items.shirts * CLOTHING_ITEM_COSTS["shirts"] +
            assessment.shopping.clothing_items.pants * CLOTHING_ITEM_COSTS["pants"] +
            assessment.shopping.clothing_items.outerwear * CLOTHING_ITEM_COSTS["outerwear"] +
            assessment.shopping.clothing_items.shoes * CLOTHING_ITEM_COSTS["shoes"]
        ) * MONTHS_IN_YEAR
        money_saved += clothing_spend_annual * CLOTHING_SPEND_REDUCTION_RATE

        res.shopping = ShoppingSchema(**res.shopping.model_dump())
        return res, money_saved

    @classmethod
    def get_profile(cls, state: TwinState, assessment: AssessmentCreateRequest) -> TwinProfile:
        from app.schemas.assessment import VehicleType, SolarSetupTier

        # Calculate commute details
        dists = assessment.transportation.get_mode_distances()
        car_dist = dists["car"]
        transit_dist = dists["public_transit"]
        bike_dist = dists["bicycle"]
        walk_dist = dists["walking"]

        total_commute = car_dist + transit_dist + bike_dist + walk_dist
        
        # Flight details
        num_flights = len(assessment.transportation.flight_records)
        flight_emissions = sum(f.carbon_emissions_kg for f in assessment.transportation.flight_records)
        
        # Energy details
        solar_tier = assessment.home_energy.solar_tier
        solar_val = solar_tier.value if hasattr(solar_tier, "value") else solar_tier
        renewable_pct = assessment.home_energy.renewable_energy_percentage or 0.0
        
        # Shopping details
        food_deliveries = assessment.shopping.food_deliveries_per_week
        package_deliveries = assessment.shopping.package_deliveries_per_week
        clothing_purchases = (
            assessment.shopping.clothing_items.shirts +
            assessment.shopping.clothing_items.pants +
            assessment.shopping.clothing_items.outerwear +
            assessment.shopping.clothing_items.shoes
        )
        shopping_emissions = state.shopping_kg

        # Classification priorities:
        # 1. Frequent Flyer
        if num_flights >= FREQUENT_FLYER_FLIGHTS or flight_emissions > FREQUENT_FLYER_EMISSIONS_KG:
            return TwinProfile(
                archetype="Frequent Flyer",
                strengths=[
                    "High global mobility and cross-border connectivity.",
                    "Efficient long-distance travel management."
                ],
                weaknesses=[
                    "Very high aviation carbon intensity.",
                    "Disproportionate contribution to high-altitude transit emissions."
                ],
                risk_areas=[
                    "High-altitude radiative forcing impacts.",
                    "Direct scaling of carbon footprint with travel frequency."
                ],
                opportunity_areas=[
                    "Consolidate multiple trips into longer, single visits.",
                    "Replace short-haul flights with electric high-speed rail options.",
                    "Leverage virtual collaboration tools to minimize corporate travel."
                ]
            )

        # 2. High Consumption Shopper
        if shopping_emissions > HIGH_CONSUMER_SHOPPING_KG or (food_deliveries + package_deliveries) > HIGH_CONSUMER_DELIVERIES or clothing_purchases > HIGH_CONSUMER_CLOTHING_ITEMS:
            return TwinProfile(
                archetype="High Consumption Shopper",
                strengths=[
                    "Supports delivery logistics and local e-commerce services.",
                    "Active participation in consumer product economies."
                ],
                weaknesses=[
                    "High volume of discretionary shopping emissions.",
                    "Courier transit emissions and packaging waste generation."
                ],
                risk_areas=[
                    "Resource depletion from fast fashion and short-lifespan consumer electronics.",
                    "Compounded supply chain emissions from upstream production."
                ],
                opportunity_areas=[
                    "Consolidate e-commerce orders to minimize packaging and delivery trips.",
                    "Shift towards circular consumer choices, such as secondhand fashion.",
                    "Extend device lifespans of electronics to 4+ years before replacement."
                ]
            )

        # 3. Urban Transit Optimizer
        transit_ratio = (bike_dist + walk_dist + transit_dist) / total_commute if total_commute > 0 else 0.0
        is_clean_vehicle = assessment.transportation.vehicle_type in [VehicleType.ELECTRIC, VehicleType.HYBRID]
        
        if (total_commute > 0 and transit_ratio >= URBAN_OPTIMIZER_RATIO) or (is_clean_vehicle and car_dist > 0):
            return TwinProfile(
                archetype="Urban Transit Optimizer",
                strengths=[
                    "Low dependency on single-occupancy gasoline vehicles.",
                    "Highly optimized urban footprint using transit and active mobility."
                ],
                weaknesses=[
                    "Potential exposure to local air quality issues during active transit.",
                    "Dependence on the decarbonization speed of the public municipal grid."
                ],
                risk_areas=[
                    "Vulnerability to municipal transit route cuts or schedule disruptions.",
                    "Weather-related transit constraints (extreme heat, cold, or rain)."
                ],
                opportunity_areas=[
                    "Encourage electrification of regional and city transit buses.",
                    "Maximize bicycle use for commutes under 10 km.",
                    "Advocate for safe, protected multi-use transit pathways."
                ]
            )

        # 4. Energy Efficient Household
        if state.energy_kg < ENERGY_EFFICIENT_ENERGY_KG or solar_val in ["medium", "large"] or renewable_pct >= ENERGY_EFFICIENT_RENEWABLE_PCT:
            return TwinProfile(
                archetype="Energy Efficient Household",
                strengths=[
                    "Excellent home energy conservation and low grid dependency.",
                    "High adoption of renewable self-generation systems."
                ],
                weaknesses=[
                    "Diminishing marginal returns for further home efficiency investments.",
                    "Dependency on solar generation during grid outages."
                ],
                risk_areas=[
                    "AC energy load spikes during extreme seasonal summer temperatures.",
                    "Potential battery storage limitations during extended cloudy periods."
                ],
                opportunity_areas=[
                    "Upgrade building insulation and seal thermal leaks.",
                    "Shift remaining home appliances to highly-efficient heat pump technology.",
                    "Explore community energy sharing schemes."
                ]
            )

        # 5. Balanced Sustainable User (Fallback)
        return TwinProfile(
            archetype="Balanced Sustainable User",
            strengths=[
                "Well-distributed and moderate carbon footprint across all sectors.",
                "Lower baseline emissions compared to national averages."
            ],
            weaknesses=[
                "Lack of a single major target category makes improvements feel incremental.",
                "Potential plateauing of optimization efforts."
            ],
            risk_areas=[
                "Inadvertent emissions creep from minor lifestyle additions.",
                "Dependency on broader national grid and supply chain decarbonization."
            ],
            opportunity_areas=[
                "Adopt a plant-forward diet to further optimize food emissions.",
                "Direct support towards verified local carbon removal projects.",
                "Participate in local climate actions and community initiatives."
            ]
        )

    @classmethod
    def generate_twin(cls, assessment: AssessmentCreateRequest, accepted_rules: Optional[List[str]] = None) -> tuple[
        TwinState, TwinState, TwinState, TwinProfile, TwinProfile, TwinProfile, float, float, int, List[str], List[TwinRecommendationItem]
    ]:
        current_data = CarbonCalculationService.calculate_footprint(assessment)
        current_state = TwinState(
            transportation_kg=current_data["breakdown"]["transportation"],
            energy_kg=current_data["breakdown"]["energy"],
            food_kg=current_data["breakdown"]["food"],
            shopping_kg=current_data["breakdown"]["shopping"],
            total_kg=current_data["total_kg"],
            carbon_score=current_data["carbon_score"]
        )

        # 1. Evaluate individual rule savings on top of baseline
        rules_info = [
            {
                "id": "transit",
                "title": "Use Transit More Often",
                "category": "transportation",
                "description": "Switch car commutes to public transit or cycling to cut down on gasoline emissions.",
                "apply_fn": cls.apply_transit_rule,
                "confidence_base": 95,
                "is_applicable": (assessment.transportation.weekly_distance_km or 0.0) > 0 and assessment.transportation.vehicle_type != VehicleType.NONE
            },
            {
                "id": "reduce_flights",
                "title": "Reduce Annual Flights",
                "category": "transportation",
                "description": "Cut annual flight frequencies by 50% using rail travel or virtual meetings.",
                "apply_fn": cls.apply_flights_rule,
                "confidence_base": 90,
                "is_applicable": len(assessment.transportation.flight_records) > 0
            },
            {
                "id": "optimize_energy",
                "title": "Optimize Energy Usage",
                "category": "energy",
                "description": "Upgrade to energy-efficient appliances and set up solar panels to lower grid electricity usage.",
                "apply_fn": cls.apply_energy_rule,
                "confidence_base": 92,
                "is_applicable": assessment.home_energy.monthly_electricity_bill_inr > 0 or len(assessment.home_energy.appliances) > 0
            },
            {
                "id": "diet_shift",
                "title": "Shift to Balanced Diet",
                "category": "food",
                "description": "Reduce high-carbon beef and dairy portions in meals, substituting plant proteins.",
                "apply_fn": cls.apply_diet_rule,
                "confidence_base": 94,
                "is_applicable": assessment.food_habits.diet_type in [FoodHabit.HIGH_MEAT, FoodHabit.MIXED]
            },
            {
                "id": "reduce_delivery",
                "title": "Reduce Delivery Frequency",
                "category": "shopping",
                "description": "Consolidate online package shipments and reduce weekly food delivery orders.",
                "apply_fn": cls.apply_delivery_rule,
                "confidence_base": 88,
                "is_applicable": assessment.shopping.food_deliveries_per_week > 0 or assessment.shopping.package_deliveries_per_week > 0 or (assessment.shopping.clothing_purchases_per_month or 0) > 0
            }
        ]

        # Calculate individual metrics
        individual_items = []
        for rinfo in rules_info:
            rec_id = cast(str, rinfo["id"])
            rec_title = cast(str, rinfo["title"])
            rec_category = cast(str, rinfo["category"])
            rec_desc = cast(str, rinfo["description"])
            confidence_base = cast(int, rinfo["confidence_base"])
            if rinfo["is_applicable"]:
                modified_assessment, rule_money = cast(Callable, rinfo["apply_fn"])(assessment)
                modified_calc = CarbonCalculationService.calculate_footprint(modified_assessment)
                emissions_saved_kg = max(0.0, current_state.total_kg - modified_calc["total_kg"])
                
                individual_items.append(TwinRecommendationItem(
                    id=rec_id,
                    title=rec_title,
                    category=rec_category,
                    description=rec_desc,
                    emissions_reduction_kg=round(emissions_saved_kg, 2),
                    money_saved_usd=round(rule_money, 2),
                    accepted=False, # Temp
                    confidence_percentage=confidence_base
                ))
            else:
                individual_items.append(TwinRecommendationItem(
                    id=rec_id,
                    title=rec_title,
                    category=rec_category,
                    description=rec_desc,
                    emissions_reduction_kg=0.0,
                    money_saved_usd=0.0,
                    accepted=False,
                    confidence_percentage=0
                ))

        # 2. Build customized future assessment based on active rules
        is_ai_mode = accepted_rules is None
        active_rules = []
        
        future_assessment = deepcopy(assessment)
        money_saved_usd = 0.0
        applied_rules_strings = []

        for ritem in individual_items:
            rule_id = ritem.id
            should_apply = False
            
            if is_ai_mode:
                should_apply = bool(next(x for x in rules_info if x["id"] == rule_id)["is_applicable"])
            else:
                should_apply = accepted_rules is not None and rule_id in accepted_rules

            ritem.accepted = should_apply

            if should_apply:
                active_rules.append(rule_id)
                rinfo = next(x for x in rules_info if x["id"] == rule_id)
                future_assessment, rule_saved_money = cast(Callable, rinfo["apply_fn"])(future_assessment)
                money_saved_usd += rule_saved_money
                applied_rules_strings.append(ritem.title)

        # Recalculate future state
        future_data = CarbonCalculationService.calculate_footprint(future_assessment)
        future_state = TwinState(
            transportation_kg=future_data["breakdown"]["transportation"],
            energy_kg=future_data["breakdown"]["energy"],
            food_kg=future_data["breakdown"]["food"],
            shopping_kg=future_data["breakdown"]["shopping"],
            total_kg=future_data["total_kg"],
            carbon_score=future_data["carbon_score"]
        )

        # 3. Build potential assessment by applying ALL applicable rules (max optimization)
        potential_assessment = deepcopy(assessment)
        for rinfo in rules_info:
            if rinfo["is_applicable"]:
                potential_assessment, _ = cast(Callable, rinfo["apply_fn"])(potential_assessment)

        potential_data = CarbonCalculationService.calculate_footprint(potential_assessment)
        potential_state = TwinState(
            transportation_kg=potential_data["breakdown"]["transportation"],
            energy_kg=potential_data["breakdown"]["energy"],
            food_kg=potential_data["breakdown"]["food"],
            shopping_kg=potential_data["breakdown"]["shopping"],
            total_kg=potential_data["total_kg"],
            carbon_score=potential_data["carbon_score"]
        )

        # 4. Generate Profiles
        current_profile = cls.get_profile(current_state, assessment)
        future_profile = cls.get_profile(future_state, future_assessment)
        potential_profile = cls.get_profile(potential_state, potential_assessment)

        if current_state.total_kg > 0:
            reduction_percentage = ((current_state.total_kg - future_state.total_kg) / current_state.total_kg) * 100
        else:
            reduction_percentage = 0.0

        score_improvement = future_state.carbon_score - current_state.carbon_score

        return (
            current_state, future_state, potential_state,
            current_profile, future_profile, potential_profile,
            reduction_percentage, money_saved_usd, score_improvement,
            applied_rules_strings, individual_items
        )
