const isProduction = process.env.NODE_ENV === 'production'

const productionPublicEnvDefaults: Record<string, string> = {
  NEXT_PUBLIC_API_BASE:
    'https://knappi-spring-788527456103.us-central1.run.app/api/v1',
  NEXT_PUBLIC_API_ORIGIN:
    'https://knappi-spring-788527456103.us-central1.run.app',
  NEXT_PUBLIC_AI_BASE: 'https://knappi-ai-cvolibfsla-uc.a.run.app',
}

const readPublicRuntimeEnv = (name: string, fallback: string): string => {
  const value = process.env[name]

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (isProduction) {
    return productionPublicEnvDefaults[name] ?? fallback
  }

  return fallback
}

export const API_BASE = readPublicRuntimeEnv(
  'NEXT_PUBLIC_API_BASE',
  'http://localhost:8080/api/v1'
)
export const API_ORIGIN = readPublicRuntimeEnv(
  'NEXT_PUBLIC_API_ORIGIN',
  API_BASE.replace(/\/api\/v1$/, '')
)
export const AI_BASE = readPublicRuntimeEnv('NEXT_PUBLIC_AI_BASE', 'http://localhost:8081')
