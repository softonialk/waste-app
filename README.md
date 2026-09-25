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

## How pickups work

1. A household requests a free pickup (no account; the request is linked to the
   device, and can be reclaimed elsewhere with its reference and phone number).
2. A verified collector in any district accepts it, collects the waste and records the weight.
3. The household confirms the pickup (or reports a problem). Only then does the
   collector earn 100 coins. Admins can approve, reject, reopen or cancel pickups.
4. Collectors redeem coins for rewards; admins mark each reward as delivered.

## Tests

```bash
npm run lint && npm run typecheck
MONGODB_URI=mongodb://127.0.0.1:27017 npm test   # API tests need a MongoDB server
```

GitHub Actions runs the same checks and a production build on every pull request.

## Environment variables

| Name | Purpose |
|---|---|
| `MONGODB_URI` | **Required.** MongoDB connection string, e.g. from MongoDB Atlas |
| `MONGODB_DB` | Optional. Database name (defaults to `ecoloop`) |
| `ADMIN_PASSWORD` | Optional. Enables the admin portal, which is needed to verify collectors |
| `ADMIN_SESSION_TOKEN` | Optional. Derived from `MONGODB_URI` and the admin password when unset |
| `RATE_LIMIT_SALT` | Optional. Derived from `MONGODB_URI` when unset |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional. Contact email shown in the footer and privacy notice |

## Deploy on Vercel

1. Create a MongoDB Atlas cluster, or add MongoDB Atlas from the Vercel
   Marketplace, which sets `MONGODB_URI` for you. In Atlas **Network Access**,
   allow `0.0.0.0/0`, since Vercel functions do not use fixed IP addresses.
2. Import the repository in Vercel (framework preset: Next.js) and add the
   `MONGODB_URI` (and optionally the other variables above) for Production.
3. In **Project → Settings → Domains**, add `www.nextgen.mom` and `nextgen.mom`
   (redirect `nextgen.mom` to `www.nextgen.mom`), then add the DNS records
   Vercel shows at your domain registrar.
