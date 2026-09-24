# Architecture

The repository is an npm workspace with a Vite React client and an Express API. The API owns authentication, authorization, validation, audit logging, and all Prisma access. The client stores only the short-lived access token in browser storage and sends it as a bearer token for protected REST calls.

The Prisma graph is `User -> ActivityLog` and `Number -> TelegramAccount -> Session`. Telegram endpoints intentionally expose configuration state only. They do not initiate account creation, retrieve OTPs, persist authentication secrets, or provide restriction-evasion features.

For production, put the client behind a TLS reverse proxy, set a strong `JWT_SECRET`, restrict `CLIENT_ORIGIN`, run migrations as a deployment step, and use a managed/private PostgreSQL instance. The compose file is intended for local development and Codespaces.