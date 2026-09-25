# EcoLoop — Smart Waste Management

Households request free pickups of sorted recyclable waste, verified collectors
complete them and earn coins, and admins verify collectors.

Built with Next.js (App Router) and MongoDB. Deployed on Vercel at
https://www.nextgen.mom.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI and the secrets
npm run dev
```

Collections and indexes are created automatically on first connection.

## Environment variables

| Name | Purpose |
|---|---|
| `MONGODB_URI` | **Required.** MongoDB connection string, e.g. from MongoDB Atlas |
| `MONGODB_DB` | Optional. Database name (defaults to `ecoloop`) |
| `ADMIN_PASSWORD` | Optional. Enables the admin portal, which is needed to verify collectors |
| `ADMIN_SESSION_TOKEN` | Optional. Derived from `MONGODB_URI` and the admin password when unset |
| `RATE_LIMIT_SALT` | Optional. Derived from `MONGODB_URI` when unset |

## Deploy on Vercel

1. Create a MongoDB Atlas cluster, or add MongoDB Atlas from the Vercel
   Marketplace, which sets `MONGODB_URI` for you. In Atlas **Network Access**,
   allow `0.0.0.0/0`, since Vercel functions do not use fixed IP addresses.
2. Import the repository in Vercel (framework preset: Next.js) and add the
   `MONGODB_URI` (and optionally the other variables above) for Production.
3. In **Project → Settings → Domains**, add `www.nextgen.mom` and `nextgen.mom`
   (redirect `nextgen.mom` to `www.nextgen.mom`), then add the DNS records
   Vercel shows at your domain registrar.
