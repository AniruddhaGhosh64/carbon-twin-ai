from fastapi import APIRouter, Header, HTTPException, Depends
from app.schemas.assessment import (
    AssessmentCreateRequest,
    CarbonCalculateResponse,
    LatestCalculationResponse,
    LatestAssessmentResponse,
    FoodExtractResponse
)
from app.services.carbon_service import CarbonCalculationService
from app.repositories.assessment_repository import AssessmentRepository
from app.repositories.carbon_repository import CarbonRepository
from app.repositories.progress_repository import ProgressRepository
from app.core.security import rate_limiter
import datetime

router = APIRouter(prefix="/api/v1/footprint", tags=["Carbon"], dependencies=[Depends(rate_limiter(60))])
assessment_repo = AssessmentRepository()
carbon_repo = CarbonRepository()
progress_repo = ProgressRepository()

@router.post("/calculate", response_model=CarbonCalculateResponse)
async def calculate_footprint(request: AssessmentCreateRequest, x_user_id: str = Header(default="default_user")):
    """
    Calculate the carbon footprint based on the assessment data and persist to Firestore.
    """
    result = CarbonCalculationService.calculate_footprint(request)
    
    saved_assessment = assessment_repo.create_assessment(x_user_id, request.model_dump())
    
    calc_dict = {
        "total_kg": result["total_kg"],
        "total_tons": result["total_tons"],
        "carbon_score": result["carbon_score"],
        "breakdown": result["breakdown"]
    }
    saved_calc = carbon_repo.create_calculation(x_user_id, saved_assessment["id"], calc_dict)
    
    today = datetime.date.today().isoformat()
    progress_repo.add_history_entry(
        user_id=x_user_id,
        date=today,
        score=result["carbon_score"],
        emissions_kg=result["total_kg"]
    )
    
    data_response = {
        "id": saved_assessment["id"],
        "user_id": x_user_id,
        "transportation": saved_assessment["transportation"],
        "home_energy": saved_assessment["home_energy"],
        "food_habits": saved_assessment["food_habits"],
        "shopping": saved_assessment["shopping"],
        "calculated_footprint_tons": result["total_tons"],
        "carbon_score": result["carbon_score"],
        "emissions_breakdown": result["breakdown"],
        "created_at": saved_assessment["created_at"]
    }
    
    return {
        "success": True,
        "data": data_response
    }

@router.get("/latest", response_model=LatestCalculationResponse)
def get_latest_calculation(x_user_id: str = Header(default="default_user")):
    """
    Retrieve the user's latest calculation from Firestore.
    """
    calc = carbon_repo.get_latest_calculation(x_user_id)
    if not calc:
        raise HTTPException(status_code=404, detail="No calculations found for this user")
    return {
        "success": True,
        "data": calc
    }

@router.get("/assessment/latest", response_model=LatestAssessmentResponse)
def get_latest_assessment(x_user_id: str = Header(default="default_user")):
    """
    Retrieve the user's latest assessment from Firestore.
    """
    assessment = assessment_repo.get_latest_assessment(x_user_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="No assessments found for this user")
    return {
        "success": True,
        "data": assessment
    }


import json
from google import genai
from google.genai import types
from pydantic import BaseModel
from typing import List
from app.core.config import settings

class FoodExtractRequest(BaseModel):
    text: str

@router.post("/food/extract", response_model=FoodExtractResponse, dependencies=[Depends(rate_limiter(limit=10, timeframe=60))])
async def extract_food_items(request: FoodExtractRequest):
    """
    Extract food items, categories, and confidence scores from text using Gemini.
    If no API key is present or it fails, uses a fallback rule-based matching.
    """
    text = request.text
    if not text.strip():
        return {"success": True, "data": {"items": []}}

    fallback_keywords = [
        {"keywords": ["beef", "steak", "hamburger", "veal"], "category": "beef", "name": "Beef"},
        {"keywords": ["chicken", "poultry", "turkey", "duck"], "category": "poultry", "name": "Chicken"},
        {"keywords": ["fish", "salmon", "tuna", "shrimp", "seafood", "lobster", "crab"], "category": "fish", "name": "Fish"},
        {"keywords": ["milk", "cheese", "butter", "dairy", "yogurt", "egg", "cream"], "category": "dairy", "name": "Dairy / Eggs"},
        {"keywords": ["tofu", "soy", "beans", "lentils", "chickpeas", "nuts", "almonds", "plant protein"], "category": "plant_protein", "name": "Plant Protein"},
        {"keywords": ["salad", "tomato", "lettuce", "onion", "vegetable", "skinach", "carrot", "broccoli", "potato"], "category": "vegetables", "name": "Vegetables"},
        {"keywords": ["bread", "rice", "wheat", "pasta", "oats", "cereal", "grain", "tortilla", "garlic bread"], "category": "grains", "name": "Grains"},
    ]

    items = []
    keys = settings.gemini_api_keys
    success = False

    if keys:
        for key_index, api_key in enumerate(keys):
            try:
                client = genai.Client(api_key=api_key)
                
                prompt = f"""
                You are a food and diet analysis assistant.
                Extract all food items mentioned in the following user text.
                For each item, classify it into one of these exact categories: 'beef', 'poultry', 'fish', 'dairy', 'plant_protein', 'vegetables', 'grains', 'other'.
                
                Do NOT estimate portion sizes.
                
                User Text: "{text}"
                """
                
                class ExtractedItem(BaseModel):
                    name: str
                    category: str
                    confidence: float

                class ExtractedList(BaseModel):
                    items: List[ExtractedItem]

                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=ExtractedList
                    )
                )
                
                res_data = json.loads(response.text) if response.text else {"items": []}
                items = res_data.get("items", [])
                success = True
                break
            except Exception as e:
                print(f"Gemini API with Key {key_index + 1} failed: {e}")
                
        if not success:
            lower_text = text.lower()
            for mapping in fallback_keywords:
                for kw in mapping["keywords"]:
                    if kw in lower_text:
                        items.append({
                            "name": mapping["name"],
                            "category": mapping["category"],
                            "confidence": 0.85
                        })
                        break
    else:
        lower_text = text.lower()
        for mapping in fallback_keywords:
            for kw in mapping["keywords"]:
                if kw in lower_text:
                    items.append({
                        "name": mapping["name"],
                        "category": mapping["category"],
                        "confidence": 0.85
                    })
                    break
                    
    if not items:
        items.append({
            "name": text[:50],
            "category": "other",
            "confidence": 0.50
        })

    return {
        "success": True,
        "data": {
            "items": items
        }
    }
