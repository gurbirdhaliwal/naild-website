import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const productionPublicEnvDefaults: Record<string, string> = {
  NEXT_PUBLIC_API_BASE: "https://api.knappi.ca/api/v1",
  NEXT_PUBLIC_API_ORIGIN: "https://api.knappi.ca",
  NEXT_PUBLIC_AI_BASE: "https://ai.knappi.ca",
};

const readPublicEnv = (name: string, fallback: string): string => {
  const value = process.env[name];

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (isProduction) {
    return productionPublicEnvDefaults[name] ?? fallback;
  }

  return fallback;
};

const toOrigin = (url: string | undefined): string | null => {
  if (!url) return null;

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const connectSrc = new Set(["'self'", "https:", "wss:"]);

if (!isProduction) {
  // Support local API/AI services in development.
  connectSrc.add("http:");
  connectSrc.add("ws:");
  connectSrc.add("http://localhost:8080");
  connectSrc.add("http://localhost:8081");
  connectSrc.add("http://127.0.0.1:8080");
  connectSrc.add("http://127.0.0.1:8081");
  connectSrc.add("http://host.docker.internal:8080");
  connectSrc.add("http://host.docker.internal:8081");
}

const publicApiBase = readPublicEnv(
  "NEXT_PUBLIC_API_BASE",
  "http://localhost:8080/api/v1"
);
const publicApiOrigin = readPublicEnv(
  "NEXT_PUBLIC_API_ORIGIN",
  publicApiBase.replace(/\/api\/v1$/, "")
);
const publicAiBase = readPublicEnv("NEXT_PUBLIC_AI_BASE", "http://localhost:8081");

const apiBaseOrigin = toOrigin(publicApiBase);
const apiOrigin = toOrigin(publicApiOrigin);
const aiBaseOrigin = toOrigin(publicAiBase);
const mediaOrigin = toOrigin(process.env.NEXT_PUBLIC_MEDIA_ORIGIN);

if (apiBaseOrigin) connectSrc.add(apiBaseOrigin);
if (apiOrigin) connectSrc.add(apiOrigin);
if (aiBaseOrigin) connectSrc.add(aiBaseOrigin);

const mediaSrc = new Set(["'self'", "blob:"]);
if (mediaOrigin) mediaSrc.add(mediaOrigin);

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${Array.from(connectSrc).join(" ")}`,
  `media-src ${Array.from(mediaSrc).join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
]
  .join("; ")
  .trim();

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
