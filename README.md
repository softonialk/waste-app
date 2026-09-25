# EcoLoop — Smart Waste Management

Households request free pickups of sorted recyclable waste, verified collectors
complete them and earn coins, and admins verify collectors.

Built with Next.js (App Router) and a [Turso](https://turso.tech) (libSQL /
SQLite) database. Deployed on Vercel at https://www.nextgen.mom.

## Local development

```bash
npm install
cp .env.example .env.local   # TURSO_DATABASE_URL=file:local.db works for a local DB
TURSO_DATABASE_URL=file:local.db npm run db:migrate
npm run dev
```

## Environment variables

| Name | Purpose |
|---|---|
| `TURSO_DATABASE_URL` | libSQL URL, e.g. `libsql://ecoloop-<org>.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso database token |
| `ADMIN_PASSWORD` | Admin portal password |
| `ADMIN_SESSION_TOKEN` | Long random string (`openssl rand -hex 32`) |
| `RATE_LIMIT_SALT` | Long random string (`openssl rand -hex 32`) |

## Deploy on Vercel

1. Create a Turso database and token (`turso db create ecoloop`,
   `turso db show ecoloop --url`, `turso db tokens create ecoloop`), or add
   Turso from the Vercel Marketplace, which sets the variables for you.
2. Apply migrations once:
   `TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run db:migrate`
3. Import the repository in Vercel (framework preset: Next.js) and add the
   environment variables above for Production.
4. In **Project → Settings → Domains**, add `www.nextgen.mom` and `nextgen.mom`
   (redirect `nextgen.mom` to `www.nextgen.mom`), then add the DNS records
   Vercel shows at your domain registrar.
