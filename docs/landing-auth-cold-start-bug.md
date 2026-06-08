# Landing Page Auth Cold-Start Bug

## Summary

The public landing page could hang on a blank white screen for 20+ seconds during a cold start when the Spring auth backend was unavailable or still starting. The page was blocked by a global frontend authentication probe to `/api/v1/auth/me`.

This was a public-route availability bug: a best-effort session check for UI state was treated like a required render dependency.

## How The Bug Was Found

The issue was isolated by observing that the landing page did not render until the `auth/me` request completed or timed out. When the Spring backend was down entirely, the blank page lasted until the network request failed.

Code tracing showed the blocking chain:

- `src/app/layout.tsx` mounts `AuthProvider` globally for all routes.
- `src/app/context/AuthContext.tsx` immediately calls `${API_BASE}/auth/me` on mount and starts with `loading = true`.
- `src/app/page.tsx` returned a blank white screen while `loading` was true.
- `src/app/components/Navbar.tsx` also hid public auth actions while `loading` was true.

Backend review showed why the auth probe was slow on cold start:

- `GET /api/v1/auth/me` parsed the JWT and then called `userRepository.findByEmail(...)`.
- That database lookup could wake Cloud SQL and force JVM, Hibernate, and Hikari initialization before the public page could render.
- Spring production config used `spring.jpa.hibernate.ddl-auto=update` and `spring.jpa.show-sql=true`, which are poor defaults for cold-start-sensitive production services.

## Root Cause

The root cause was coupling public page rendering to a backend-dependent auth check.

`/auth/me` is useful for determining whether the visitor already has a session, but the landing page does not require that information before rendering. Because the auth provider was global and the page rendered nothing while `loading`, an unavailable or cold Spring service held the public route hostage.

## How It Was Fixed

### Frontend

`AuthProvider` was made route-aware:

- Public routes, including `/`, initialize with `loading = false`.
- Public routes still run `/auth/me`, but only as a background state update.
- Public auth checks use a short timeout.
- Protected routes, such as `/interview`, still block on auth so protected UI does not flash before authorization is known.

The landing page was changed so it no longer returns a blank screen while auth is loading. The primary CTA now navigates to login even if the background auth check has not finished.

The navbar now shows login/signup while auth is unresolved or unauthenticated. If the user is already authenticated, those actions disappear after the background session check resolves.

### Backend

`/api/v1/auth/me` was changed to validate the JWT statelessly by default:

- New JWTs include lightweight session claims such as user id, email, name, role, auth provider, voice id, and password-change timestamp.
- `JwtService.extractSession(...)` builds the session response from signed token claims.
- The passive `/auth/me` request no longer needs to query Cloud SQL by default.
- Strict database validation remains available with `APP_AUTH_ME_REQUIRE_DB_VALIDATION=true`.

The JWT request filter was also updated to populate the security context from token claims instead of loading `UserDetails` from the database on every authenticated request.

Spring cold-start configuration was tightened:

- `spring.jpa.hibernate.ddl-auto` now defaults to `none`.
- SQL logging now defaults to off.
- `spring.jpa.open-in-view=false`.
- Hikari defaults use a small, lazy pool.
- Cloud Run deploy config adds min instances, CPU boost, and memory settings for `knappi-spring`.

Local Docker development explicitly keeps `ddl-auto=update` so local schema iteration still works.

## How It Was Tested

Frontend checks:

```bash
npm run typecheck
npm run lint
npm run build
```

Spring checks:

```bash
mvn clean test
```

The Spring test suite includes coverage for:

- Stateless `/auth/me` returning a valid session without calling `UserRepository`.
- Optional strict `/auth/me` DB validation still using `UserRepository`.
- JWT session claims round-tripping through `JwtService`.
- Existing auth cookie behavior for login, signup verification, and reauth flows.

Expected manual verification:

1. Stop or block the Spring auth backend.
2. Load `/`.
3. Confirm the landing page renders immediately instead of waiting for `/auth/me`.
4. Navigate to `/interview`.
5. Confirm protected-route auth behavior still waits and redirects unauthenticated users to `/login`.
6. Start Spring and log in.
7. Confirm public pages update authenticated UI state after the background session check resolves.

## Regression Risk

The main tradeoff is that public pages may briefly show logged-out UI to a signed-in user until the background auth check completes. This is intentional and preferable to blocking the public page.

Protected routes still preserve blocking auth behavior.

## Files Involved

- `src/app/context/AuthContext.tsx`
- `src/app/page.tsx`
- `src/app/components/Navbar.tsx`
- `security/src/main/java/com/knappi/security/auth/AuthenticationController.java`
- `security/src/main/java/com/knappi/security/config/JwtService.java`
- `security/src/main/java/com/knappi/security/config/JwtAuthenticationFilter.java`
- `security/src/main/resources/application.properties`
- `security/.github/workflows/deploy-cloud-run.yml`
