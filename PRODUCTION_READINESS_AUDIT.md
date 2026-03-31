# Production Readiness Audit

Original audit date: 2026-03-30
Status updated: 2026-03-30

Original verdict: Not ready for production deployment.

Current status on this branch: The code fixes from this audit have been implemented and re-verified locally.

## Remediation Summary

- P0 build blocker: resolved
- P0 Next.js security blocker: resolved
- P1 fake-success interview persistence: resolved
- P1 missing production web container/deploy path: resolved
- P1 incomplete production env contract: resolved
- P2 missing health/readiness endpoints: resolved
- P2 missing CI/test automation: resolved
- P3 shared logo image warnings: resolved

## Current Verification Snapshot

The branch now passes:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `NEXT_PUBLIC_API_BASE=https://api.example.com/api/v1 NEXT_PUBLIC_API_ORIGIN=https://api.example.com NEXT_PUBLIC_AI_BASE=https://ai.example.com npm run build`
- `python3 -m py_compile python_backend/main.py python_backend/ai_client.py`
- `python3 -m compileall python_backend`
- `python3 -m unittest discover -s python_backend/tests`
- `npm audit --omit=dev --audit-level=high --json` with `0` high/critical production vulnerabilities

## Remaining Deployment Prerequisites

- Provide real production values for the public frontend env vars at build time
- Configure the Cloud Run AI service account with Vertex AI access
- Point `SPRING_API_BASE` at the real production Spring Boot API
- Set `CORS_ALLOW_ORIGINS` to the real web origin

## Historical Findings

The findings below are retained as the original audit record. They have been addressed on this branch unless noted otherwise.

## Scope

This audit covered the Next.js frontend, the FastAPI AI backend, and the deployment artifacts present in this repo.

## Checks Run

- `npm run lint`
- `npm run build`
- `npx tsc --noEmit`
- `python3 -m py_compile python_backend/main.py`
- `python3 -m compileall python_backend`
- `python3 python_backend/main.py`
- `npm audit --omit=dev --audit-level=high --json`

## Findings

### P0 Blocker: Next.js production build fails

Evidence:

- `npm run build` fails during type checking.
- `npx tsc --noEmit` reports:
  - `src/app/page.tsx(1204,29): Property 'ctaLabel' does not exist ...`
  - `src/app/page.tsx(1209,33): Property 'ctaLabel' does not exist ...`
- The root cause is in `src/app/page.tsx`:
  - `planCards` is declared as `as const`, but the `Starter` card has no `ctaLabel`: `src/app/page.tsx:100-130`
  - The render path assumes every union member can be read as `plan.ctaLabel`: `src/app/page.tsx:1204-1209`

Impact:

- The app cannot produce a deployable production build.

Recommendation:

- Normalize the card shape so every plan has `ctaLabel?: string`, or guard the read with a property check such as `'ctaLabel' in plan`.

### P0 Security Blocker: Frontend dependency has a critical Next.js vulnerability

Evidence:

- The repo is pinned to `next@15.3.2`: `package.json:17`
- `npm audit --omit=dev --audit-level=high --json` reported one critical direct vulnerability in `next`.
- The audit output provides a non-breaking fix target: `next@15.5.14`

Impact:

- Shipping a known-critical framework vulnerability is not acceptable for production.

Recommendation:

- Upgrade `next` and `eslint-config-next` together to at least `15.5.14`, then rerun `npm run build` and regression checks.

### P1 High: Interview persistence silently degrades to fake success when the backend is unavailable

Evidence:

- `getUserInterviews()` swallows non-auth failures and returns an empty list: `src/app/services/interviewService.ts:204-215`
- `createInterview()` returns a mock interview if the request fails for a non-HTTP reason: `src/app/services/interviewService.ts:226-258`
- `updateInterviewMessages()` returns a mock response instead of failing: `src/app/services/interviewService.ts:263-297`
- `updateGradingResult()` returns a mock response instead of failing: `src/app/services/interviewService.ts:299-333`
- `updateInterviewTitle()` can fabricate a success response after both update paths fail: `src/app/services/interviewService.ts:335-377`
- `deleteInterview()` logs and suppresses failure: `src/app/services/interviewService.ts:380-391`

Impact:

- Users can believe interviews were created, updated, graded, renamed, or deleted when nothing was persisted.
- Production incidents in the Spring API layer can look like normal app behavior instead of surfacing as errors.

Recommendation:

- Remove test-only mock fallbacks from production code.
- Fail closed for persistence operations and show explicit retry/error states in the UI.

### P1 High: The repo does not include a real production container/deploy path for the web app

Evidence:

- The only frontend Dockerfile is `Dockerfile.web.dev`: `Dockerfile.web.dev:1-14`
- That image starts the dev server, not a production server: `Dockerfile.web.dev:14`
- `docker-compose.yml` bind-mounts the source tree and enables polling, which is a development setup: `docker-compose.yml:17-26`
- No CI workflow files were found during the repo scan.

Impact:

- The repo does not currently define a production-grade web image or repeatable deployment pipeline.
- If this compose setup is reused in production, it will run `next dev`, which is slower, less stable, and not the intended runtime for production traffic.

Recommendation:

- Add a dedicated production Dockerfile that builds with `next build` and serves with `next start` or `output: 'standalone'`.
- Add CI to enforce build, lint, and dependency checks before deploy.

### P1 High: Production environment contract is incomplete for a multi-service deployment

Evidence:

- The documented env file only contains three frontend public variables: `.env.example:1-3`
- The browser code hard-falls back to localhost API/AI endpoints if those vars are absent: `src/app/services/api.ts:1-6`
- The FastAPI backend falls back to localhost-only CORS origins if `CORS_ALLOW_ORIGINS` is not set: `python_backend/main.py:22-31`
- The FastAPI backend also falls back to localhost upstreams for the Spring API and Ollama: `python_backend/main.py:57-66`

Impact:

- A partially configured production deploy can boot with broken CORS, invalid upstream targets, or browser-visible localhost URLs.
- Because the frontend calls the AI backend directly from the browser, cross-origin production setup has to be exact.

Recommendation:

- Expand `.env.example` into a real deployment contract that includes backend env vars.
- Fail fast on missing production-critical env vars instead of silently defaulting to localhost values.

### P2 Medium: The backend has no health/readiness endpoint, and startup is coupled to model initialization

Evidence:

- Only six POST routes are defined, and no health/readiness route exists: `python_backend/main.py:790`, `python_backend/main.py:858`, `python_backend/main.py:954`, `python_backend/main.py:1079`, `python_backend/main.py:1139`, `python_backend/main.py:1256`
- The app instantiates `WhisperModel("tiny")` during module import: `python_backend/main.py:39-55`

Impact:

- Orchestrators and load balancers do not have a lightweight endpoint to probe.
- Startup time and readiness depend on model initialization, which can make rollouts and restarts fragile.

Recommendation:

- Add `/healthz` and `/readyz` endpoints.
- Consider lazy-loading or explicitly warming heavyweight model dependencies.

### P2 Medium: There is no automated test suite or CI gate in this repo

Evidence:

- `package.json` has `dev`, `build`, `start`, and `lint` scripts only: `package.json:5-10`
- No `*.test.*` or `*.spec.*` files were found under `src`
- No GitHub Actions workflow files were found during the scan

Impact:

- Production readiness depends on manual checks.
- The current build blocker on the landing page reached the default branch without a guardrail catching it earlier.

Recommendation:

- Add at minimum:
  - typecheck
  - lint
  - frontend smoke tests
  - backend API smoke tests
- Run them in CI on every PR.

### P3 Low: CSP is present but still allows inline scripts and styles

Evidence:

- `script-src 'self' 'unsafe-inline'`: `next.config.ts:37-40`
- `style-src 'self' 'unsafe-inline'`: `next.config.ts:37-40`

Impact:

- This weakens XSS hardening compared with a nonce- or hash-based CSP.

Recommendation:

- Tighten the CSP once the app is stable enough to support nonces or hashes.

### P3 Low: Lint warnings show unoptimized logo images in shared navigation

Evidence:

- `src/app/components/Navbar.tsx:16`
- `src/app/components/Sidebar.tsx:247`
- `npm run lint` warns on both for `@next/next/no-img-element`

Impact:

- This is not a release blocker, but it can hurt LCP and bandwidth efficiency.

Recommendation:

- Replace shared `<img>` logos with `next/image` or an explicit image optimization strategy.

## Verification Notes

- Python syntax checks passed: `python3 -m py_compile python_backend/main.py` and `python3 -m compileall python_backend`
- Direct backend startup in the current local interpreter failed immediately with `ModuleNotFoundError: No module named 'numpy'`
- I did not modify the local Python environment during this audit, so that startup failure reflects the current machine state, not necessarily the Docker image state

## Release Decision

Do not deploy this repo to production until the following are complete:

1. Fix the TypeScript/build failure in `src/app/page.tsx`
2. Upgrade Next.js to a non-vulnerable release and rebuild
3. Remove fake-success persistence fallbacks from the frontend
4. Define a real production deployment path and environment contract
