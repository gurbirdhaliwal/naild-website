export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080/api/v1';
export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? API_BASE.replace(/\/api\/v1$/, '');
export const AI_BASE =
  process.env.NEXT_PUBLIC_AI_BASE ?? 'http://localhost:8081';
