# masteraeo.com

Monorepo for the AI visibility product: public Next.js site + Express API.
See `docs/PRODUCT_PLAN.md` for phases and progress.

## Structure

```
apps/api      Express + MongoDB + Anthropic (secrets, LLM, jobs)
apps/web      Next.js static export + Ant Design + Redux Toolkit + Persist
packages/shared   Shared CATEGORIES, MODELS, DTOs
docs/         Product plan and delivery tracking
```

Claude **simulates** ChatGPT / Gemini / Perplexity styles (planned fake multi-model).

## Prerequisites

- Node 20+
- MongoDB running locally (or a Mongo URI)
- Anthropic API key

## Setup

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# edit apps/api/.env — set all required vars (no defaults in code)
npm run build:shared
```

## Develop

```bash
npm run dev:api
npm run dev:web
```

- Web: http://localhost:3000  
- API: http://localhost:4000/api/v1/health  

## Seed users

Add `JWT_SECRET`, `JWT_EXPIRES_IN`, and `SIGNUP_ENABLED=false` to `apps/api/.env` (see `.env.example`).

```bash
SEED_ADMIN_EMAIL=admin@masteraeo.com \
SEED_ADMIN_PASSWORD='choose-a-password' \
SEED_BUSINESS_EMAIL=demo@masteraeo.com \
SEED_BUSINESS_PASSWORD='choose-a-password' \
npm run seed
```

Then open `/login` and use the business account. Signup remains invite-only while `SIGNUP_ENABLED=false`.
