# CarbonTwin AI - Production Security & Platform Hardening Plan

This implementation plan outlines the security hardening, API versioning, input validation, XSS protection, SQL injection verification, secret rotation, dependency scanning, and verification steps to transition CarbonTwin AI from a hackathon prototype to production readiness.

---

## Goal Description
Enhance backend and frontend security, standardize API routes under a versioned structure (`/api/v1/...`), prevent injection attacks (SQLi, XSS), implement strict rate limiting on sensitive and public routes, enable Gemini API key rotation (up to 3 keys), audit dependencies, and output a comprehensive security audit report (`security_audit.md`).

---

## User Review Required

> [!IMPORTANT]
> - **API Path Changes:** All backend endpoints are moved from legacy prefixes (like `/carbon`, `/recommendations`, `/twin`) to versioned prefixes (e.g. `/api/v1/footprint`, `/api/v1/dashboard`, `/api/v1/carbontwin`). Frontend fetch operations will be fully updated to reference `/api/v1/...`.
> - **FastAPI Compatible Rate Limiter:** An in-memory sliding-window rate limiter will be implemented in `backend/app/core/security.py` using `client_ip` and `X-User-Id` header to avoid complex external setup (e.g., Redis).
> - **Strict Rate Limits:**
>   - Login: 5 requests / minute
>   - Register: 3 requests / minute
>   - Gemini Narrative & Extraction: 10 requests / minute
>   - General endpoints: 60 requests / minute
> - **HTML Escaping for XSS Protection:** Any user-provided string fields will be HTML-escaped on input validation via Pydantic model field sanitizers.
> - **Gemini API Key Rotation:** We support loading up to 3 keys (`GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`) in `.env`. The backend automatically rotates to the next key if a key fails.

---

## Proposed Changes

### Component 1: Backend Settings & Secrets Management

#### [MODIFY] [config.py](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/app/core/config.py)
- Add environment variables `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`.
- Implement a helper property `gemini_api_keys` returning a deduplicated list of active keys, falling back to `GEMINI_API_KEY`.
- Secure JWT secrets.

#### [MODIFY] [.env](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/.env)
- Populate placeholder keys `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3` for rotation testing.

---

### Component 2: In-Memory Rate Limiter & XSS Sanitizer

#### [NEW] [security.py](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/app/core/security.py)
- Create `RateLimiter` sliding window registry.
- Define a dependency function `rate_limiter(limit: int, timeframe: int = 60)` checking client IP and `X-User-Id`.
- Add a text sanitization function using `html.escape`.

---

### Component 3: Input Validation & Schemas Hardening

#### [MODIFY] [assessment.py](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/app/schemas/assessment.py)
- Validate custom appliance names (`min_length=1`, `max_length=100`).
- Validate food entry names (`min_length=1`, `max_length=150`).
- Validate large purchase item names (`min_length=1`, `max_length=150`).
- Apply `html.escape` sanitization to all incoming strings.

#### [MODIFY] [eco_actions.py](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/app/schemas/eco_actions.py)
- Apply string length validations (`min_length=1`, `max_length=100` for titles, `max_length=500` for descriptions, `max_length=1000` for config notes).
- Sanitize strings using `html.escape` pre-validators.

#### [MODIFY] [simulator.py](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/app/schemas/simulator.py)
- Add string length validation on custom scenario names.
- Escape all custom strings.

#### [MODIFY] [user.py](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/app/schemas/user.py)
- Ensure email and password requirements are strictly enforced (`min_length=6` for passwords, `EmailStr` for email formatting, sanitizing user names).

---

### Component 4: API Routes Versioning & Rate Limit Enforcement

#### [MODIFY] [auth.py](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/app/api/routes/auth.py)
- Prefix routes with `/api/v1/auth`.
- Enforce rate limit of 3/min on `/register` and 5/min on `/login` and `/google-login`.

#### [MODIFY] [carbon.py](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/app/api/routes/carbon.py)
- Prefix routes with `/api/v1/footprint`.
- Apply rate limit of 10/min on `/food/extract` and 60/min on others.
- Implement Gemini API key rotation logic in `extract_food_items`.

#### [MODIFY] [recommendations.py](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/app/api/routes/recommendations.py)
- Prefix routes with `/api/v1/dashboard`.
- Enforce rate limit of 60/min on recommendations endpoints.

#### [MODIFY] [twin.py](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/app/api/routes/twin.py)
- Prefix routes with `/api/v1/carbontwin`.
- Enforce rate limit of 10/min on `/generate` and `/apply_simulation` and `/latest?regenerate=true`.

#### [MODIFY] [simulator.py](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/app/api/routes/simulator.py)
- Prefix routes with `/api/v1/simulator`.
- Enforce rate limit of 60/min.

#### [MODIFY] [eco.py](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/app/api/routes/eco.py)
- Prefix routes with `/api/v1/eco-actions`.
- Enforce rate limit of 60/min.

#### [MODIFY] [progress.py](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/app/api/routes/progress.py)
- Prefix routes with `/api/v1/progress`.
- Enforce rate limit of 60/min.

#### [MODIFY] [main.py](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/app/main.py)
- Update how routers are registered, ensuring tags and metadata align with versioning.

---

### Component 5: Services Updates for Gemini Rotation

#### [MODIFY] [carbon_coach_service.py](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/app/services/carbon_coach_service.py)
- Import `settings` from `app.core.config`.
- Loop through `settings.gemini_api_keys` to perform rotation and retry on key failure.

#### [MODIFY] [recommendations_service.py](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/app/services/recommendation_service.py)
- Update Gemini narrative/coaching generation to loop through `settings.gemini_api_keys`.

---

### Component 6: Frontend Routing Update

#### [MODIFY] Frontend Files
Update API URLs from:
- `http://127.0.0.1:8000/auth/...` $\rightarrow$ `http://127.0.0.1:8000/api/v1/auth/...`
- `http://127.0.0.1:8000/carbon/...` $\rightarrow$ `http://127.0.0.1:8000/api/v1/footprint/...`
- `http://127.0.0.1:8000/recommendations/...` $\rightarrow$ `http://127.0.0.1:8000/api/v1/dashboard/...`
- `http://127.0.0.1:8000/twin/...` $\rightarrow$ `http://127.0.0.1:8000/api/v1/carbontwin/...`
- `http://127.0.0.1:8000/simulator/...` $\rightarrow$ `http://127.0.0.1:8000/api/v1/simulator/...`
- `http://127.0.0.1:8000/eco-actions/...` $\rightarrow$ `http://127.0.0.1:8000/api/v1/eco-actions/...`
- `http://127.0.0.1:8000/progress/...` $\rightarrow$ `http://127.0.0.1:8000/api/v1/progress/...`

Specific files:
- [CarbonContext.tsx](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/frontend/src/context/CarbonContext.tsx)
- [FoodTrackingModule.tsx](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/frontend/src/components/footprint/FoodTrackingModule.tsx)
- [auth.ts](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/frontend/src/auth.ts)
- [page.tsx](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/frontend/src/app/page.tsx)
- [simulator/page.tsx](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/frontend/src/app/(dashboard)/simulator/page.tsx)
- [progress/page.tsx](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/frontend/src/app/(dashboard)/progress/page.tsx)
- [eco-actions/page.tsx](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/frontend/src/app/(dashboard)/eco-actions/page.tsx)

---

### Component 7: Dependency Scanning & Audit Report

#### [NEW] [security_audit.md](file:///c:/Antigravity/Prompt%20Wars/prompt-wars%203/backend/security_audit.md)
- Run `pip-audit` for python package validation.
- Run `npm audit` for frontend NPM packages.
- Compile findings, risks found, fixes applied, remaining risks, and long-term recommendations.

---

## Verification Plan

### Automated Tests
- Run `pytest` to verify all 18 existing tests pass.
- Update test files to use new versioned paths:
  - `backend/tests/test_auth.py`
  - `backend/tests/test_carbon_coach.py`
  - `backend/tests/test_eco_actions.py`
  - `backend/tests/test_progress.py`
- Verify that tests execute and pass successfully.

### Manual Verification
1. **Rate Limiting Check:** Submit login requests rapidly to verify that a `429 Too Many Requests` is raised after 5 calls.
2. **XSS Injection Sanitization Check:** Submit an appliance name containing `<script>alert('xss')</script>`. Verify that it is returned as `&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;` and stored safely.
3. **Google Key Rotation Check:** Provide an invalid API key as `GEMINI_API_KEY_1` and a valid one as `GEMINI_API_KEY_2`. Verify that the Carbon Coach service rotates past the broken key and generates the narrative.
4. **App End-to-End Navigation:** Traverse through Footprint $\rightarrow$ Dashboard $\rightarrow$ Carbon Twin $\rightarrow$ Impact Simulator $\rightarrow$ Eco Actions $\rightarrow$ Progress and ensure all fetch calls succeed over versioned APIs.
