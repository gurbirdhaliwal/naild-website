# CORS Guide

## Architecture

Knappi runs the web app and backend services on separate subdomains:

- `https://knappi.ca` serves the Next.js frontend.
- `https://ai.knappi.ca` serves the FastAPI AI backend, including `POST /transcription`.
- `https://api.knappi.ca` serves the Spring API.

Browsers treat each subdomain as a different origin. Any frontend request from `https://knappi.ca` to `https://ai.knappi.ca` must pass CORS checks before the browser exposes the response to JavaScript.

## FastAPI AI Service

The AI service uses `CORSMiddleware` in `python_backend/main.py`. Because frontend requests use `credentials: 'include'`, do not use `"*"` for `allow_origins`.

Current safe pattern:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://knappi.ca",
        "https://staging.knappi.ca",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Production origins can also be added with the `CORS_ALLOW_ORIGINS` environment variable:

```bash
CORS_ALLOW_ORIGINS=https://staging.knappi.ca,https://preview.knappi.ca
```

The canonical production origin `https://knappi.ca` is included by default. Keep origin values exact: include the scheme, omit trailing slashes, and do not include paths.

## Adding a New Web Origin

1. Confirm the browser origin shown in DevTools, for example `https://staging.knappi.ca`.
2. Add that exact origin to the service's allowed origins or `CORS_ALLOW_ORIGINS`.
3. Keep `allow_credentials=True` when the frontend sends cookies.
4. Redeploy the backend service that receives the browser request.
5. Test the preflight request before testing the full upload.

Preflight check:

```bash
curl -i -X OPTIONS https://ai.knappi.ca/transcription \
  -H "Origin: https://knappi.ca" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

Expected result:

- Status is `200` or `204`.
- `access-control-allow-origin` is `https://knappi.ca`.
- `access-control-allow-credentials` is `true`.
- The request does not try to parse an audio upload.

## Troubleshooting

- Missing `Access-Control-Allow-Origin`: the request origin is not in the backend allowlist, or a proxy/load balancer is returning the response before the app handles CORS.
- Wildcard conflict: if the console says credentials are not allowed with `Access-Control-Allow-Origin: *`, replace `"*"` with explicit origins and keep `allow_credentials=True`.
- Preflight returns `401`, `403`, `404`, or `422`: make sure `OPTIONS` is handled by CORS middleware or the proxy before route auth/body validation.
- Works in curl but not the browser: compare the browser's exact `Origin`, requested method, and requested headers with the curl preflight.
- Works locally but not production: verify the deployed service environment variables and that the correct backend service was redeployed.
