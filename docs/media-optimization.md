# Media Optimization

## Batch Compression

Run from `Naild-WebApp/naild-website`:

```bash
python3 scripts/compress_media.py public public/media-optimized --webm
```

The script preserves originals and writes WebP images, MP4/WebM videos, and WebP video posters under `public/media-optimized`. If the output directory is inside the input directory, it is skipped on future runs to avoid re-processing optimized assets.

## Frontend Loading

The landing page scroll animation uses optimized MP4/WebM sources and poster images. Video sources are only attached after the `Why Knappi` section approaches the viewport. The active video uses `preload="metadata"` and hidden videos use `preload="none"`.

Large landing-page images now point at generated WebP files and use blur placeholders. Keep hero imagery marked `priority` only when it is above the fold.

## Backend Streaming

FastAPI exposes:

```text
GET /media/{path}
```

Set `MEDIA_ROOT` to the asset directory. The route supports `Range: bytes=start-end`, returns `206 Partial Content`, and streams bounded chunks.

Spring Boot exposes:

```text
GET /api/v1/media/**
```

Set `APP_MEDIA_ROOT` to the asset directory. The controller streams full-file responses with `FileSystemResource` and range responses with `ResourceRegion`.

## CDN Migration

Recommended production path:

1. Upload only optimized assets from `public/media-optimized` to object storage, for example `s3://knappi-media/public/media-optimized/...`.
2. Put CloudFront or Cloud CDN in front of the bucket with long-lived immutable caching for hashed or versioned paths.
3. Set `NEXT_PUBLIC_MEDIA_ORIGIN` to the CDN origin so Next.js CSP permits CDN media.
4. Replace local `/media-optimized/...` URLs with `${NEXT_PUBLIC_MEDIA_ORIGIN}/media-optimized/...` when ready.
5. Use pre-signed URLs only for private user media; public marketing assets should be CDN-public and cacheable.
