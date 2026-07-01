# Pingload Admin Dashboard

Production admin panel for the Pingload fintech platform.

## Tech Stack

- React 19 + Vite 8
- Tailwind CSS v4
- React Router v7
- Axios → `https://pingload.top/api`
- Recharts (analytics)

## Local Development

```bash
cd admin
npm install
cp .env.example .env.local   # optional — defaults to localhost:5003
npm run dev
```

Open http://localhost:5174

## Production Build

```bash
cd admin
npm install
npm run build    # uses .env.production → VITE_API_URL=https://pingload.top/api
```

Output: `admin/dist/`

## Render Static Site Deployment

The repo root `render.yaml` defines the `pingload-admin` static service:

| Setting | Value |
|---------|-------|
| **Type** | Static Site |
| **Root Directory** | `admin` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |
| **Environment Variable** | `VITE_API_URL=https://pingload.top/api` |

SPA routing is configured via:
- `render.yaml` → `routes: [{ type: rewrite, source: /*, destination: /index.html }]`
- `public/_redirects` → `/* /index.html 200` (fallback)

### Custom domain

Add `admin.pingload.top` in Render → Settings → Custom Domains, then create a DNS record:

| Type | Name | Value |
|------|------|-------|
| CNAME | `admin` | `<your-render-static-host>.onrender.com` |

Backend CORS is already set to `https://admin.pingload.top` in `render.yaml`.

### Admin login

Use credentials from Render `ADMIN_PASSWORD` (seeded on backend deploy). Default email: `admin@pingload.top`.

## Pages

Dashboard, Users, Transactions, Refunds, Wallets, Services, Service Prices, Data Plans, KYC, FAQ, Notifications, Referrals, Support, Settings.
