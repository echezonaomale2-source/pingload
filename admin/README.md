# Pingload Admin Dashboard

Production-ready admin panel for the Pingload fintech platform.

## Tech Stack

- React 19 + Vite
- Tailwind CSS v4
- React Router v7
- Axios (pre-configured, not connected yet)
- Recharts (analytics)
- Lucide React (icons)

## Getting Started

```bash
cd admin
npm install
npm run dev
```

Open [http://localhost:5174](http://localhost:5174)

## Demo Login

| Email | Password |
|-------|----------|
| admin@pingload.com | admin123 |

## Pages

1. **Dashboard** — Stats, revenue charts, service breakdown, recent transactions
2. **Users** — Search, view, suspend/activate, credit/debit wallet
3. **Transactions** — Search, filter by service/status, view details
4. **Wallets** — Credit/debit wallets, transaction history
5. **Services** — Enable/disable platform services
6. **Notifications** — Send to all or specific users
7. **Referrals** — Referral list, earnings, top referrers
8. **Support** — Ticket management, reply, close
9. **Settings** — Admin password, system configuration

## Project Structure

```
admin/
├── src/
│   ├── components/     # Reusable UI (StatCard, DataTable, Modal, etc.)
│   ├── context/        # Auth context (mock JWT)
│   ├── data/           # Mock/dummy data
│   ├── layouts/        # Sidebar, TopNavbar, AdminLayout
│   ├── pages/          # All admin pages
│   ├── routes/         # Protected route guard
│   └── services/       # Axios instance (ready for API)
```

## API Integration

The dashboard is connected to the Pingload backend at `http://localhost:5003/api/admin`.

Set `VITE_API_URL` in `.env`:

```
VITE_API_URL=http://localhost:5003/api
```

Ensure the backend is running and has seeded the admin account (see backend `.env`):

```
ADMIN_EMAIL=admin@pingload.com
ADMIN_PASSWORD=admin123
```
