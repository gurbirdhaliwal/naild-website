# GCP Deployment

This repo is set up to deploy the Next.js web app and the FastAPI AI service as separate Cloud Run services.

## Target topology

- `naild-web`: Next.js standalone server built from `Dockerfile.web`
- `naild-ai`: FastAPI AI service built from `python_backend/Dockerfile`
- External Spring Boot API: configured through `SPRING_API_BASE`
- Model provider in production: Vertex AI Gemini 2.5 Flash

## Production environment contract

Frontend build-time variables:

- `NEXT_PUBLIC_API_BASE`
- `NEXT_PUBLIC_API_ORIGIN`
- `NEXT_PUBLIC_AI_BASE`

AI backend runtime variables:

- `APP_ENV=production`
- `AI_PROVIDER=vertex_ai`
- `GOOGLE_CLOUD_PROJECT`
- `VERTEX_AI_LOCATION`
- `GEMINI_MODEL=gemini-2.5-flash`
- `SPRING_API_BASE`
- `CORS_ALLOW_ORIGINS`

## Cloud Run notes

- The AI service must remain publicly reachable from the browser because the frontend calls it directly.
- Authentication is still enforced at the application layer by forwarding the existing auth cookies or authorization header to the Spring API.
- Cloud Run injects `PORT`; the backend now respects that automatically.
- The AI service exposes `GET /healthz` and `GET /readyz` for platform probes.

## Deploy with Cloud Build

1. Create an Artifact Registry Docker repository in your target region.
2. Configure the substitutions in `cloudbuild.gcp.yaml`:
   - `_WEB_ORIGIN`
   - `_API_PUBLIC_BASE`
   - `_API_PUBLIC_ORIGIN`
   - `_AI_PUBLIC_BASE`
   - `_SPRING_API_BASE`
3. Submit the build:

```bash
gcloud builds submit --config cloudbuild.gcp.yaml
```

## IAM and APIs

Ensure the target GCP project has:

- Cloud Run Admin API enabled
- Cloud Build API enabled
- Artifact Registry API enabled
- Vertex AI API enabled

The Cloud Run service account for `naild-ai` needs permission to call Vertex AI.
