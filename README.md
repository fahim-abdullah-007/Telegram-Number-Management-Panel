# Telegram Number Management Panel

An admin dashboard for managing legitimate phone-number inventory and Telegram account/session metadata. This project does not create accounts, collect OTPs, store Telegram passwords, or bypass Telegram restrictions.

## Features

- JWT authentication with bcrypt password hashing and ADMIN, OPERATOR, and VIEWER roles.
- Number inventory with search, status/country filters, pagination, CSV import/export, duplicate detection, and audit logs.
- Telegram integration status/configuration using official API configuration environment variables only.
- Account/session records, disconnect and local-record deletion workflows.
- Dashboard statistics, recent activity, system health, and API status.
- Prisma/PostgreSQL data model, Zod validation, Helmet, CORS, rate limiting, Pino logging, and centralized errors.
- Responsive React/Vite/Tailwind admin interface.

## Technology stack

TypeScript, React, Vite, Tailwind CSS, Node.js, Express, PostgreSQL, Prisma, JWT, bcrypt, Zod, Pino.

## Installation

```bash
npm install
cp .env.example .env
npm run db:generate
npx prisma migrate dev --schema server/prisma/schema.prisma --name init
npm run dev
```

The client runs at `http://localhost:5173`; the API runs at `http://localhost:4000`.

## Environment variables

See `.env.example`. Required values are `DATABASE_URL` and `JWT_SECRET`. Set `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` only when configuring a legitimate Telegram integration. Secrets are never returned by the API.

## Database setup

PostgreSQL is available through `docker compose up -d postgres`. Then run `npm run db:generate` and `npx prisma migrate dev --schema server/prisma/schema.prisma --name init`.

## Development and production

```bash
npm run dev
npm run build
npm run start
```

`npm run build` compiles both workspaces. `npm run start` starts the compiled Express server.

## Default admin creation

Create an admin after migration with `npm run db:seed -- --email admin@example.com --password 'change-this-password'`. Change the password immediately in production. No default password is embedded in the application.

## API documentation

All responses use `{ success, data, message }`; failures use `{ success: false, message, error }`.

| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/register` | Public, creates VIEWER |
| POST | `/api/auth/login` | Public, rate limited |
| POST | `/api/auth/logout` | Authenticated |
| GET | `/api/auth/me` | Authenticated |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/api-keys` | Authenticated JWT, own keys |
| GET | `/api/api-keys` | Authenticated JWT, own keys |
| DELETE | `/api/api-keys/:id` | Authenticated JWT, own keys |
| POST | `/api/api-keys/:id/rotate` | Authenticated JWT, own keys |
| GET/POST | `/api/numbers` | Authenticated / operator |
| GET/PUT/DELETE | `/api/numbers/:id` | Authenticated / operator |
| GET | `/api/accounts`, `/api/accounts/:id` | Authenticated |
| POST/DELETE | `/api/accounts/:id/disconnect`, `/api/accounts/:id` | Operator / admin |
| GET | `/api/logs` | Authenticated |
| GET | `/api/dashboard/stats` | Authenticated |
| GET/POST/POST | `/api/telegram/status`, `/api/telegram/connect`, `/api/telegram/disconnect` | Authenticated / admin |

API keys use `Authorization: Bearer YOUR_API_KEY`. Available scopes are `numbers:read`, `numbers:write`, `telegram:read`, `telegram:write`, `dashboard:read`, and `activity:read`. API keys are hashed at rest, shown in full only once after creation or rotation, and are limited by `API_RATE_LIMIT` requests per `API_RATE_WINDOW_MS` per key. Revoked and expired keys return `401`; missing scopes return `403`.

## Security notes

Use a long random `JWT_SECRET`, HTTPS, a private database, and restrictive CORS in production. The application does not log passwords, tokens, API secrets, session strings, or OTP codes. Telegram connect/disconnect endpoints only manage local configuration state; an official Telegram client/authentication flow must be integrated separately with explicit user consent.

## Telegram API setup

Obtain API credentials from Telegram's official developer portal and place them in `.env` as `TELEGRAM_API_ID` and `TELEGRAM_API_HASH`. The settings screen shows only whether credentials are configured, never their values.

## Docker and Codespaces

Run `docker compose up --build` and forward ports `5173` and `4000` in Codespaces.

## Troubleshooting

- If Prisma cannot connect, confirm PostgreSQL is running and `DATABASE_URL` matches the compose service.
- If the client cannot reach the API, set `VITE_API_URL` and confirm port `4000` is forwarded.
- If migrations fail, run `npm run db:generate` and retry against an empty development database.
