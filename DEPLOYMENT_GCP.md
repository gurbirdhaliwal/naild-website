# GCP Deployment

This repo is set up to deploy the Next.js web app, FastAPI AI service, and Spring Boot API as separate Cloud Run services.

## Target topology

- `knappi-web`: Next.js standalone server built from `Naild-WebApp/naild-website/Dockerfile.web`
- `knappi-ai`: FastAPI AI service built from `Naild-WebApp/naild-website/python_backend/Dockerfile`
- `knappi-spring`: Spring Boot API built from `security/Dockerfile`
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

Spring API runtime variables:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD` from Secret Manager
- `CORS_ALLOW_ORIGINS`
- `APP_AUTH_COOKIE_SECURE=true`
- `APP_AUTH_COOKIE_SAME_SITE=Lax`
- `APP_AUTH_COOKIE_DOMAIN=.knappi.ca`
- `APP_JWT_SECRET` from Secret Manager
- `SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID`
- `SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_SECRET` from Secret Manager
- `APP_PASSWORD_RESET_BASE_URL`
- `APP_PASSWORD_RESET_EXPIRY_MINUTES`
- `APP_MAIL_MODE`
- `APP_MAIL_FROM`

## Cloud Run notes

- The AI service must remain publicly reachable from the browser because the frontend calls it directly.
- Authentication is enforced with a Secure, HttpOnly `token` cookie scoped to `.knappi.ca`; browser JavaScript must not store or forward JWT bearer tokens.
- Cloud Run injects `PORT`; the backend now respects that automatically.
- The AI service exposes `GET /healthz` and `GET /readyz` for platform probes.

## Deploy with GitHub Actions

Deployment is split across the service repos. Each repo uses GitHub OIDC with GCP Workload Identity Federation, not a downloaded service account key.

The configured Workload Identity provider is:

```text
projects/788527456103/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider
```

The configured deployer service account is:

```text
788527456103-compute@developer.gserviceaccount.com
```

### Web repo

The web repo workflow `.github/workflows/deploy-cloud-run.yml` builds and deploys:

- `knappi-web`
- `knappi-ai`

Create these GitHub Actions variables in the web repo:

- `GCP_PROJECT_ID`
- `GCP_REGION`, default used by the workflow is `us-central1`
- `ARTIFACT_REGISTRY_REPO`, default used by the workflow is `knappi-repo`
- `CLOUD_RUN_WEB_SERVICE`, default `knappi-web`
- `CLOUD_RUN_AI_SERVICE`, default `knappi-ai`
- `CLOUD_RUN_SERVICE_ACCOUNT`, optional runtime service account email
- `WEB_ORIGIN`, currently `https://knappi.ca`
- `NEXT_PUBLIC_API_BASE`, currently `https://api.knappi.ca/api/v1`
- `NEXT_PUBLIC_API_ORIGIN`, currently `https://api.knappi.ca`
- `NEXT_PUBLIC_AI_BASE`, currently `https://ai.knappi.ca`
- `SPRING_API_BASE`, usually same as `NEXT_PUBLIC_API_BASE`
- `AI_PROVIDER`, optional, default `vertex_ai`
- `VERTEX_AI_LOCATION`, optional, default `us-central1`
- `GEMINI_MODEL`, optional, default `gemini-2.5-flash`

### Spring repo

The Spring repo workflow `.github/workflows/deploy-cloud-run.yml` builds and deploys:

- `knappi-spring`

Create these GitHub Actions variables in the Spring repo:

- `GCP_PROJECT_ID`
- `GCP_REGION`, default used by the workflow is `us-central1`
- `ARTIFACT_REGISTRY_REPO`, default used by the workflow is `knappi-repo`
- `CLOUD_RUN_SPRING_SERVICE`, default `knappi-spring`
- `CLOUD_RUN_SERVICE_ACCOUNT`, optional runtime service account email
- `CLOUD_SQL_INSTANCE_CONNECTION_NAME`, optional, default `naild-491922:us-central1:knappi-user`
- `WEB_ORIGIN`, currently `https://knappi.ca`
- `SPRING_DATASOURCE_URL`, use `jdbc:mysql:///naild_db?cloudSqlInstance=naild-491922:us-central1:naild-mysql&socketFactory=com.google.cloud.sql.mysql.SocketFactory&useSSL=false`
- `SPRING_DATASOURCE_USERNAME`, use `naild_user`
- `GOOGLE_OAUTH_CLIENT_ID`
- `APP_PASSWORD_RESET_BASE_URL`, currently `https://knappi.ca/reset-password`
- `APP_OAUTH_SUCCESS_REDIRECT_URL`, currently `https://knappi.ca/interview`
- `APP_AUTH_COOKIE_SECURE`, use `true`
- `APP_AUTH_COOKIE_SAME_SITE`, use `Lax`
- `APP_AUTH_COOKIE_DOMAIN`, use `.knappi.ca`
- `APP_PASSWORD_RESET_EXPIRY_MINUTES`, optional, default `60`
- `APP_MAIL_MODE`, optional, default `log`
- `APP_MAIL_FROM`, optional, default `noreply@knappi.local`
- `SPRING_DATASOURCE_PASSWORD_SECRET_NAME`, optional, default `spring-datasource-password`
- `APP_JWT_SECRET_NAME`, optional, default `app-jwt-secret`
- `GOOGLE_OAUTH_CLIENT_SECRET_NAME`, optional, default `google-oauth-client-secret`

Create these Secret Manager secrets in GCP:

- `spring-datasource-password`
- `app-jwt-secret`
- `google-oauth-client-secret`

If you use different names, set the three `*_SECRET_NAME` GitHub variables above to match.

Store the production Cloud SQL password as the latest version of `spring-datasource-password`. Do not store the database password in GitHub repository variables or committed files.

Required GCP resources and IAM:

- Enable Cloud Run Admin API, Artifact Registry API, IAM Credentials API, Secret Manager API, and Vertex AI API.
- Create an Artifact Registry Docker repository matching `ARTIFACT_REGISTRY_REPO`.
- Give the GitHub deployer service account permission to push images and deploy Cloud Run, typically `roles/artifactregistry.writer` and `roles/run.admin`.
- If `CLOUD_RUN_SERVICE_ACCOUNT` is set, give the GitHub deployer service account `roles/iam.serviceAccountUser` on that runtime service account.
- Give the Cloud Run runtime service account `roles/secretmanager.secretAccessor` for the Spring secrets.
- Give the AI service runtime service account permission to call Vertex AI, for example `roles/aiplatform.user`.
- Configure the Google OAuth app redirect URI to `https://api.knappi.ca/login/oauth2/code/google`, using your actual Spring API origin.

After the GitHub and GCP setup exists, run each repo's deploy workflow manually from GitHub Actions, or push to `main` in the repo you want to deploy.

## Deploy with Cloud Build

Cloud Build remains available as a direct GCP deployment path. The app-local `cloudbuild.gcp.yaml` deploys the web and AI services. The root `cloudbuild.yaml` builds and pushes all three images, but does not deploy them.

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

The Cloud Run service account for `knappi-ai` needs permission to call Vertex AI.
