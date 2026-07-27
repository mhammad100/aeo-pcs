# Master AEO (masteraeo.com)

Monorepo for the AI visibility product.

```
apps/api      Express + MongoDB + Anthropic
apps/web      Public + business panel (Next.js static)
apps/admin    Operator console (Vite + React)
packages/shared
docs/
```

## Develop

```bash
npm install
cp apps/api/.env.example apps/api/.env   # fill required vars
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env

npm run build:shared
npm run dev:api      # :4000
npm run dev:web      # :3000
npm run dev:admin    # :5173
```

CORS must allow both web and admin origins, e.g.  
`CORS_ORIGIN=http://localhost:3000,http://localhost:5173`

## Seed

```bash
SEED_ADMIN_EMAIL=admin@masteraeo.com \
SEED_ADMIN_PASSWORD='...' \
SEED_BUSINESS_EMAIL=demo@masteraeo.com \
SEED_BUSINESS_PASSWORD='...' \
npm run seed
```

- Business login → `apps/web` `/login`  
- Admin login → `apps/admin` `/login` (role must be `admin`)

See `docs/PRODUCT_PLAN.md` for milestones.
