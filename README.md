# AEO / GEO Visibility — PCS

Monorepo for the AI visibility product: public Next.js site + Express API.
Admin portal is out of scope for now.

## Structure

```
apps/api      Express + MongoDB + Anthropic (secrets, LLM, jobs)
apps/web      Next.js static export + Ant Design + Redux Toolkit + Persist
packages/shared   Shared CATEGORIES, MODELS, DTOs
```

The original prototype (`geo-visibility-mvp-v3.jsx`) is kept as a reference.
Claude still **simulates** ChatGPT / Gemini / Perplexity styles (planned fake multi-model).

## Prerequisites

- Node 20+
- MongoDB running locally (or a Mongo URI)
- Anthropic API key

## Setup

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# edit apps/api/.env and set ANTHROPIC_API_KEY + MONGODB_URI
npm run build:shared
```

## Develop

```bash
# terminal 1
npm run dev:api

# terminal 2
npm run dev:web
```

- Web: http://localhost:3000  
- API: http://localhost:4000/api/v1/health  

## Production build (static web)

```bash
npm run build:shared
npm run build:api
npm run build:web
# apps/web/out contains the static export
```

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/business/search` | Find business candidates |
| POST | `/api/v1/prompts/generate` | Generate 5 buyer prompts |
| POST | `/api/v1/visibility/jobs` | Start async visibility job |
| GET | `/api/v1/visibility/jobs/:id` | Poll job status / results |
| POST | `/api/v1/plans` | Build action plan from job |
| POST | `/api/v1/plans/items/generate` | Generate one content item |
| GET | `/api/v1/reports/:id` | HTML report payload |
