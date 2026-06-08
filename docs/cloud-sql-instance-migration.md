# Cloud SQL Instance Migration Runbook

## Summary

The Spring API was migrated from an expired or unusable Cloud SQL instance to a new Cloud SQL MySQL instance.

The new production database target is:

- GCP project: `naild-491922`
- Region: `us-central1`
- Cloud SQL instance: `knappi-user`
- Instance connection name: `naild-491922:us-central1:knappi-user`
- Database: `knappi_db`
- Database user: `knappi_user`
- Password source: Secret Manager secret `spring-datasource-password`

The application code kept local development database defaults unchanged. Only production deployment values were moved to the new Cloud SQL instance.

## Why The Migration Was Needed

The previous production database instance was no longer usable. Spring deployments were still configured to connect to the old database identity, so new Cloud Run revisions could not start cleanly.

Because Spring creates the datasource during application startup, any Cloud SQL connection failure prevents the container from listening on port `8080`. Cloud Run then reports this as a startup probe failure even though the real root cause is database configuration.

## How The Issue Was Found

The first deployment failure showed:

```text
Access denied for user 'naild_user'@'cloudsqlproxy~...' (using password: YES)
```

That confirmed the Spring service was still using the old production database username.

Cloud Run service inspection showed that the datasource URL had been updated to the new database, but the username was still stale:

```text
SPRING_DATASOURCE_URL=jdbc:mysql:///knappi_db?cloudSqlInstance=naild-491922:us-central1:knappi-user&socketFactory=com.google.cloud.sql.mysql.SocketFactory&useSSL=false
SPRING_DATASOURCE_USERNAME=naild_user
```

After updating the username to `knappi_user`, the error changed to:

```text
Access denied for user 'knappi_user'@'cloudsqlproxy~...' (using password: YES)
```

That confirmed the service was now targeting the correct user, but the password stored in Secret Manager did not match the Cloud SQL user's password.

A later deploy also exposed a separate Hikari binding issue:

```text
Failed to bind properties under 'spring.datasource.hikari'
Property: spring.datasource.hikari.initialization-fail-timeout
Reason: The configuration of the pool is sealed once started.
```

That property was removed because Spring Cloud GCP can initialize the datasource before Spring Boot rebinding applies that Hikari setting.

## What Was Changed

### Production Deployment Values

The Spring Cloud Run deployment now points to the replacement instance:

```text
CLOUD_SQL_INSTANCE_CONNECTION_NAME=naild-491922:us-central1:knappi-user
CLOUD_SQL_DATABASE_NAME=knappi_db
SPRING_DATASOURCE_USERNAME=knappi_user
SPRING_DATASOURCE_URL=jdbc:mysql:///knappi_db?cloudSqlInstance=naild-491922:us-central1:knappi-user&socketFactory=com.google.cloud.sql.mysql.SocketFactory&useSSL=false
```

The Spring deployment workflow also validates these values so an old `naild_*` database config fails before deployment.

### Local Development Values

Local database defaults were intentionally preserved:

```properties
spring.datasource.url=${SPRING_DATASOURCE_URL:jdbc:mysql://127.0.0.1:3306/User}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME:root}
```

Local Docker Compose services can continue using the local `User` database and `root` user.

### Secret Manager

The production database password is not stored in GitHub variables or committed files.

Cloud Run receives:

```text
SPRING_DATASOURCE_PASSWORD=spring-datasource-password:latest
```

The important migration step is making sure the Cloud SQL password for `knappi_user` and the latest Secret Manager version of `spring-datasource-password` are the same value.

### Hikari Startup Config

This property was removed:

```properties
spring.datasource.hikari.initialization-fail-timeout
```

These lower-risk Hikari settings remain:

```properties
spring.datasource.hikari.minimum-idle=${SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE:0}
spring.datasource.hikari.maximum-pool-size=${SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE:5}
spring.datasource.hikari.connection-timeout=${SPRING_DATASOURCE_HIKARI_CONNECTION_TIMEOUT:5000}
```

## Migration Steps

### 1. Create Or Select The Replacement Cloud SQL Instance

The replacement instance used here is:

```text
naild-491922:us-central1:knappi-user
```

Create the production database:

```bash
gcloud sql databases create knappi_db \
  --instance=knappi-user \
  --project=naild-491922
```

Create the production database user:

```bash
gcloud sql users create knappi_user \
  --instance=knappi-user \
  --project=naild-491922 \
  --password="<secure-password>"
```

If the user already exists, reset the password instead:

```bash
gcloud sql users set-password knappi_user \
  --instance=knappi-user \
  --project=naild-491922 \
  --password="<secure-password>"
```

### 2. Store The Matching Password In Secret Manager

Add the same password as the latest version of the existing secret:

```bash
printf "%s" "<secure-password>" | gcloud secrets versions add spring-datasource-password \
  --project=naild-491922 \
  --data-file=-
```

Do not print or commit this password.

### 3. Update Spring Production Variables

The Spring workflow should deploy with:

```text
CLOUD_SQL_INSTANCE_CONNECTION_NAME=naild-491922:us-central1:knappi-user
CLOUD_SQL_DATABASE_NAME=knappi_db
SPRING_DATASOURCE_USERNAME=knappi_user
SPRING_DATASOURCE_URL=jdbc:mysql:///knappi_db?cloudSqlInstance=naild-491922:us-central1:knappi-user&socketFactory=com.google.cloud.sql.mysql.SocketFactory&useSSL=false
SPRING_DATASOURCE_PASSWORD_SECRET_NAME=spring-datasource-password
```

If updating Cloud Run manually, use:

```bash
gcloud run services update knappi-spring \
  --region=us-central1 \
  --project=naild-491922 \
  --set-cloudsql-instances=naild-491922:us-central1:knappi-user \
  --update-env-vars='SPRING_DATASOURCE_URL=jdbc:mysql:///knappi_db?cloudSqlInstance=naild-491922:us-central1:knappi-user&socketFactory=com.google.cloud.sql.mysql.SocketFactory&useSSL=false,SPRING_DATASOURCE_USERNAME=knappi_user,SPRING_CLOUD_GCP_SQL_DATABASE_NAME=knappi_db,SPRING_CLOUD_GCP_SQL_INSTANCE_CONNECTION_NAME=naild-491922:us-central1:knappi-user'
```

### 4. Remove Stale Runtime Variables

Remove the Hikari initialization timeout env var if it exists on Cloud Run:

```bash
gcloud run services update knappi-spring \
  --region=us-central1 \
  --project=naild-491922 \
  --remove-env-vars=SPRING_DATASOURCE_HIKARI_INITIALIZATION_FAIL_TIMEOUT
```

### 5. Initialize The Schema

The current production default is:

```text
SPRING_JPA_HIBERNATE_DDL_AUTO=none
```

That means deployment does not create tables automatically.

For a one-time bootstrap on an empty replacement database, temporarily deploy with:

```text
SPRING_JPA_HIBERNATE_DDL_AUTO=update
```

After the tables are created, switch it back to:

```text
SPRING_JPA_HIBERNATE_DDL_AUTO=none
```

The better long-term approach is to add Flyway or Liquibase migrations and stop relying on Hibernate schema generation for production.

### 6. Deploy Spring

Deploy the Spring API through the GitHub Actions workflow or by pushing to `main` in the Spring repo.

The deploy should build a new image, attach the new Cloud SQL instance, and inject the latest Secret Manager password.

## How It Was Tested

### Static Configuration Checks

Searches were used to verify production docs and workflow references no longer pointed to the old database values:

```bash
rg -n "naild-mysql|naild_db|naild_user" \
  Naild-WebApp/naild-website/DEPLOYMENT_GCP.md \
  security/.github/workflows/deploy-cloud-run.yml
```

Expected result: no matches.

### Cloud SQL Checks

Verify the replacement database and user exist:

```bash
gcloud sql databases list \
  --instance=knappi-user \
  --project=naild-491922

gcloud sql users list \
  --instance=knappi-user \
  --project=naild-491922
```

Expected result:

- `knappi_db` is listed.
- `knappi_user` is listed.

### Cloud Run Checks

Inspect the deployed service:

```bash
gcloud run services describe knappi-spring \
  --region=us-central1 \
  --project=naild-491922
```

Confirm:

- `SPRING_DATASOURCE_URL` points to `knappi_db`.
- `SPRING_DATASOURCE_URL` contains `knappi-user`.
- `SPRING_DATASOURCE_USERNAME` is `knappi_user`.
- `SPRING_DATASOURCE_PASSWORD` comes from `spring-datasource-password:latest`.
- `run.googleapis.com/cloudsql-instances` is `naild-491922:us-central1:knappi-user`.
- `SPRING_DATASOURCE_HIKARI_INITIALIZATION_FAIL_TIMEOUT` is not present.

### Spring Test Suite

Run:

```bash
cd security
mvn test
```

Expected result:

```text
BUILD SUCCESS
```

The last local verification after removing the unsafe Hikari property passed with `15` tests and `0` failures.

## Common Failure Modes

### Wrong Username

Symptom:

```text
Access denied for user 'naild_user'
```

Fix:

```bash
gcloud run services update knappi-spring \
  --region=us-central1 \
  --project=naild-491922 \
  --update-env-vars=SPRING_DATASOURCE_USERNAME=knappi_user
```

Also fix the GitHub Actions variable or workflow default so the next deploy does not reintroduce the old value.

### Password Mismatch

Symptom:

```text
Access denied for user 'knappi_user'
```

Fix:

Reset the Cloud SQL user password and store the exact same value as the latest `spring-datasource-password` secret version.

### Missing Tables

Symptom:

```text
Table 'knappi_db.<table_name>' doesn't exist
```

Fix:

Bootstrap the schema with a one-time `SPRING_JPA_HIBERNATE_DDL_AUTO=update` deploy, then return to `none`, or apply proper migrations.

### Hikari Binding Failure

Symptom:

```text
The configuration of the pool is sealed once started.
```

Fix:

Remove `SPRING_DATASOURCE_HIKARI_INITIALIZATION_FAIL_TIMEOUT` from Cloud Run and keep the property out of `application.properties`.

## Files Updated

- `security/.github/workflows/deploy-cloud-run.yml`
- `security/src/main/resources/application.properties`
- `Naild-WebApp/naild-website/DEPLOYMENT_GCP.md`

## Follow-Up Work

- Add Flyway or Liquibase migrations before the next schema-changing production release.
- Add a deployment checklist that verifies Cloud SQL user, database, secret, and Cloud Run env vars before shifting traffic.
- Consider exporting the old database before deletion when a future instance migration is planned rather than forced by expiration.
