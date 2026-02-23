const DEFAULT_REDIRECT = '/';

export function getSafeRedirectPath(
  redirectParam: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT
): string {
  if (!redirectParam) return fallback;

  const candidate = redirectParam.trim();

  // Only allow same-origin absolute paths (single leading slash).
  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback;
  }

  return candidate;
}
