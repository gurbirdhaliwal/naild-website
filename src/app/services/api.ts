const isProduction = process.env.NODE_ENV === 'production'

const readPublicRuntimeEnv = (name: string, fallback: string): string => {
  const value = process.env[name]

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (isProduction) {
    throw new Error(`${name} must be defined for production builds.`)
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
