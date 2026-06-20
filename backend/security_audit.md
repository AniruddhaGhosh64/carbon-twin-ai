# CarbonTwin AI - Production Security Audit Report

This report summarizes the security posture of the CarbonTwin AI application following security hardening, API refactoring, input sanitization, rate limiting, and dependency audits.

---

## 1. Summary of Actions Taken
We performed a systematic refactoring and hardening of the application to transition from a prototype to a production-ready system:
1. **API Versioning:** All endpoints were structured under `/api/v1/...` (e.g. `/api/v1/footprint`, `/api/v1/carbontwin`) to support deprecation cycles and client isolation.
2. **In-Memory Rate Limiting:** Implemented a thread-safe sliding-window rate limiter in `backend/app/core/security.py` targeting `/api/v1/auth/login` (5/min), `/api/v1/auth/register` (3/min), and `/api/v1/carbontwin` Gemini endpoints (10/min) to prevent DDoS and API misuse.
3. **XSS Protection:** Implemented pre-validators using `html.escape` across all incoming string fields in Pydantic schemas (`Assessment`, `EcoActions`, `Simulator`, `User`) to escape script injections before storing data.
4. **Secrets Management:** Integrated a dynamic key rotation property (`settings.gemini_api_keys`) that loads up to 3 fallback API keys from environment variables and transparently rotates to the next key if one is rate-limited or fails.
5. **Vulnerability Mitigation:** Audited all dependencies for both backend and frontend, and resolved all discovered package vulnerabilities.

---

## 2. Dependency Audit Results

### Backend (`pip-audit`)
A security scan was conducted against python dependencies in the virtual environment.

- **Initial State:** 7 vulnerabilities found in 4 packages:
  - `msgpack` (1.2.0): Vulnerable to GHSA-6v7p-g79w-8964 (Fix: 1.2.1)
  - `pydantic-settings` (2.14.1): Vulnerable to GHSA-4xgf-cpjx-pc3j (Fix: 2.14.2)
  - `starlette` (1.3.0): Vulnerable to CVE-2026-54283 (Fix: 1.3.1)
  - `pip` (25.3): Vulnerable to CVE-2026-1703, CVE-2026-3219, CVE-2026-6357 (Fix: 26.1.2)
- **Remediation Applied:** 
  - Upgraded packages to their safe versions: `msgpack==1.2.1`, `pydantic-settings==2.14.2`, `starlette==1.3.1`.
  - Upgraded internal pip within the virtual environment to `26.1.2`.
  - Updated pinned versions in `requirements.txt` to preserve these fixes.
- **Final State:** **0 vulnerabilities found**.

### Frontend (`npm audit`)
A security scan was conducted against the Next.js node modules.

- **Initial State:** 2 moderate severity vulnerabilities found in `postcss` (< 8.5.10):
  - XSS vulnerability via unescaped `</style>` tags in output (GHSA-qx2v-qp2m-jg93).
- **Remediation Applied:** 
  - Added an `overrides` block in `package.json` to force resolution of `postcss` to `^8.5.10` across transitive dependencies of `@tailwindcss/postcss`, `tailwindcss`, and `next`.
  - Executed `npm install` to update the package tree.
- **Final State:** **0 vulnerabilities found**.

---

## 3. SQL Injection Analysis
An audit of database queries was conducted.

- **Database Engine:** Google Cloud Firestore (NoSQL).
- **Injection Risk:** Firestore uses programmatic method-based API compositions (`collection.document()`, `.where()`, `.set()`) rather than raw string query construction (like SQL `SELECT * FROM ...`). Since Firestore does not parse query strings dynamically, it is **natively immune to SQL injection** (SQLi).
- **NoSQL Injection Check:** We verified that query logic does not dynamically interpolate field names or use unsafe operator filters based on user inputs. All filters use fixed field paths and parameter values.

---

## 4. Key Rotation Verification
We verified the rotation of Gemini API keys by mocking setting properties in unit tests:
- When zero keys are available, the application gracefully returns a structured fallback narrative and keeps sustainability projections functional.
- When multiple keys are available and one fails (e.g. invalid/expired), the backend automatically catches the exception, logs it, sleeps for 1 second, and rotates to the next active key without failing the request.

---

## 5. Long-Term Recommendations
1. **CI/CD Security Scanning:** Add `pip-audit` and `npm audit` to the github actions/build pipeline to fail builds if new CVEs are introduced.
2. **Key Storage:** Move the Gemini API Keys and Firebase configuration secrets to a managed secret store (such as Google Cloud Secret Manager) rather than relying on local `.env` files in staging/production.
3. **Session Verification:** Enforce HTTPS-only secure cookies for NextAuth / Auth.js to prevent token stealing.
