# 🌾 Smart Farmer Procurement & Queue Management System

A full-stack web platform that digitizes the agricultural procurement process — online slot booking, automated token generation, real-time queue tracking, procurement recording, and payment status tracking — for farmers, procurement-centre staff, and administrators.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Project Objectives](#3-project-objectives)
4. [Features](#4-features)
5. [Technology Stack](#5-technology-stack)
6. [Folder Structure](#6-folder-structure)
7. [MongoDB Setup](#7-mongodb-setup)
8. [Backend Setup](#8-backend-setup)
9. [Frontend Setup](#9-frontend-setup)
10. [Environment Variables](#10-environment-variables)
11. [Running Django](#11-running-django)
12. [Running React](#12-running-react)
13. [API Documentation](#13-api-documentation)
14. [Default Admin/Staff Setup](#14-default-adminstaff-setup)
15. [Real-Time Queue Architecture](#15-real-time-queue-architecture)
16. [Database Design Overview](#16-database-design-overview)
17. [Testing Instructions](#17-testing-instructions)
18. [Future Enhancements](#18-future-enhancements)

---

## 1. Project Overview

Farmers delivering crops to procurement centres traditionally face long, unstructured waiting lines with no visibility into how long they'll wait or when their turn will come. This system replaces that experience with online registration, centre and slot selection, automated queue-token generation, live queue tracking, and transparent procurement and payment record-keeping — all through role-based dashboards for **Farmers**, **Staff**, and **Administrators**.

## 2. Problem Statement

Procurement centres today suffer from:
- Long, undocumented waiting times with no queue visibility
- Physical congestion from farmers arriving without a scheduled slot
- No digital record of procurement quantity, price, or payment status
- No way for farmers to know their position in line or estimated wait
- Manual, error-prone queue management by centre staff

## 3. Project Objectives

- Allow farmers to register, select a procurement centre, and book a time slot online
- Generate a unique, sequential queue token per booking
- Display live queue position and estimated waiting time to farmers
- Give staff a queue-control tool to call farmers in order, safely under concurrent use
- Record procurement (crop, quantity, price) with server-calculated totals
- Track payment status per procurement record
- Deliver in-app notifications at every key event
- Provide separate, role-appropriate dashboards for all three user types

## 4. Features

### Farmer
- Registration & login (email or phone)
- Centre and slot browsing with live availability (`Available: X/Y`)
- Slot booking with instant token generation
- Live dashboard: token, current token, people ahead, estimated wait
- Booking history with cancellation
- Procurement and payment status visibility
- In-app notifications with unread count, real-time delivery

### Staff
- Live queue control: view waiting/serving farmers, "Call Next Farmer"
- Procurement centre CRUD (add/edit/activate/deactivate/delete)
- Procurement slot CRUD with overlap prevention
- Record procurement details with backend-calculated totals
- Payment record creation and status tracking
- Farmer directory with booking history lookup
- Operational dashboard: today's bookings, active queues, procurement/payment volume

### Admin
- Everything Staff can do, plus:
- System-wide user management (any role, activate/deactivate)
- Staff/Admin account creation (the only way these roles are created)
- Cross-centre reports with date-range filtering

### System-Wide
- JWT authentication (access + refresh, with rotation and blacklisting)
- Role-based authorization on every endpoint
- Real-time updates via WebSockets (Django Channels + Redis) — no polling
- Atomic, concurrency-safe booking and queue advancement (verified under simultaneous requests)
- Consistent `{success, message, data}` API response format throughout

## 5. Technology Stack

**Frontend:** React 18, Vite, React Router, Axios, Bootstrap 5
**Backend:** Python, Django, Django REST Framework, PyMongo, PyJWT
**Database:** MongoDB (accessed exclusively via PyMongo — no Django ORM for application data)
**Real-Time:** Django Channels, Redis (channel layer), native WebSocket API on the frontend
**Auth:** Custom JWT implementation with Django's PBKDF2 password hashers

## 6. Folder Structure

```
farmer-procurement-system/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env / .env.example
│   ├── config/                  # settings, root urls, asgi/wsgi, exception handler
│   ├── core/                    # MongoDB connection, BaseRepository, validators,
│   │                             # constants, response helpers, indexes, init_db command
│   ├── accounts/                # auth, JWT, permissions, admin user management
│   ├── farmers/                 # farmer profile, farmer dashboard, staff dashboard,
│   │                             # farmer directory, system reports
│   ├── procurement/              # centres, slots, procurement records
│   ├── queue_management/         # bookings, queue control, WebSocket consumer
│   ├── payments/                 # payment tracking
│   └── notifications/            # in-app notifications, WebSocket consumer
│
├── frontend/
│   ├── package.json
│   ├── .env / .env.example
│   └── src/
│       ├── components/           # common/, layout/, routing/, and per-feature UI
│       ├── pages/                 # auth/, farmer/, staff/, admin/
│       ├── services/               # one file per API domain, all axios-based
│       ├── context/                 # Auth, Toast, Notification providers
│       ├── hooks/                    # useFetch, useDebounce, useQueueSocket, etc.
│       ├── utils/                     # formatters, constants, token storage
│       ├── App.jsx
│       └── main.jsx
│
├── README.md
└── .gitignore
```

## 7. MongoDB Setup

**Option A — Local install:**
```bash
# Windows: install MongoDB Community Server, run as a service
# Mac:     brew install mongodb-community && brew services start mongodb-community
# Linux:   sudo apt install mongodb && sudo systemctl start mongod
```
Default connection: `mongodb://localhost:27017`

**Option B — MongoDB Atlas (recommended for demos):**
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Add your IP under Network Access (or `0.0.0.0/0` for testing)
3. Create a database user and copy the connection string
4. Use that string as `MONGO_URI` in `backend/.env`

No manual schema/collection creation is needed — collections are created automatically when the first document (or index) is written. Run `python manage.py init_db` after setup to create all required indexes (see Section 8).

## 8. Backend Setup

```bash
cd backend
python -m venv venv

# Activate:
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

pip install -r requirements.txt
cp .env.example .env         # then fill in real values — see Section 10
python manage.py init_db     # verifies MongoDB connection, creates all indexes
python manage.py seed_users  # creates default admin + staff accounts
```

## 9. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env         # defaults usually work unchanged for local dev
```

## 10. Environment Variables

**`backend/.env`:**
```env
DEBUG=True
SECRET_KEY=your-django-secret-key-here
JWT_SECRET=your-jwt-signing-secret-here
JWT_ACCESS_TOKEN_MINUTES=60
JWT_REFRESH_TOKEN_DAYS=7
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=farmer_procurement_db
CORS_ALLOWED_ORIGINS=http://localhost:5173
REDIS_URL=redis://127.0.0.1:6379
```

**`frontend/.env`:**
```env
VITE_API_URL=http://127.0.0.1:8000/api
VITE_WS_URL=ws://127.0.0.1:8000/ws
```

> ⚠️ Never commit real `.env` files. Only `.env.example` (with placeholder values) belongs in version control — enforced by `.gitignore`.

## 11. Running Django

Requires **MongoDB** and **Redis** both running first (see Sections 7 and the prerequisites in Step 1).

```bash
cd backend
venv\Scripts\activate    # or source venv/bin/activate
python manage.py runserver
```
Backend runs at `http://127.0.0.1:8000`. Django Channels handles both HTTP and WebSocket traffic through this same command during development.

## 12. Running React

```bash
cd frontend
npm run dev
```
Frontend runs at `http://localhost:5173`.

## 13. API Documentation

All endpoints are prefixed `/api/`. Every response follows:
```json
{ "success": true, "message": "...", "data": {} }
{ "success": false, "message": "..." }
```

| Domain | Method | Endpoint | Access |
|---|---|---|---|
| **Auth** | POST | `/auth/register/` | Public |
| | POST | `/auth/login/` | Public |
| | POST | `/auth/staff-login/` | Public (rejects farmers) |
| | POST | `/auth/refresh/` | Public (valid refresh token) |
| | POST | `/auth/logout/` | Authenticated |
| | GET | `/auth/me/` | Authenticated |
| | GET/POST | `/auth/admin/users/`, `/auth/admin/staff/` | Admin |
| **Farmers** | GET/PUT | `/farmers/profile/` | Farmer |
| | GET | `/farmers/dashboard/` | Farmer |
| | GET | `/farmers/staff-dashboard/`, `/farmers/directory/` | Staff/Admin |
| | GET | `/farmers/reports/` | Admin |
| **Centres** | GET/POST | `/centres/` | Read: any; Write: Staff/Admin |
| | GET | `/centres/active/` | Authenticated |
| | PUT/DELETE | `/centres/{id}/`, `/centres/{id}/status/` | Staff/Admin |
| **Slots** | GET/POST | `/slots/` | Staff/Admin |
| | GET | `/slots/available/?centre_id=` | Authenticated |
| | PUT/DELETE | `/slots/{id}/`, `/slots/{id}/status/` | Staff/Admin |
| **Bookings** | GET/POST | `/bookings/` | Farmer |
| | PUT | `/bookings/{id}/cancel/` | Farmer |
| **Queue** | GET | `/queue/status/?slot_id=` | Authenticated |
| | POST | `/queue/call-next/` | Staff/Admin |
| **Procurement** | GET/POST | `/procurement/` | Staff/Admin |
| | PUT | `/procurement/{id}/` | Staff/Admin |
| **Payments** | GET/POST | `/payments/` | Staff/Admin |
| | GET | `/payments/my/` | Farmer |
| **Notifications** | GET | `/notifications/` | Authenticated |
| | PUT | `/notifications/{id}/read/`, `/notifications/read-all/` | Authenticated |

**WebSockets:**
- `ws://host/ws/queue/<slot_id>/?token=<jwt>` — live queue state for one slot
- `ws://host/ws/notifications/?token=<jwt>` — live personal notifications

## 14. Default Admin/Staff Setup

Staff and Admin accounts cannot self-register (by design — see Step 3). Two ways to create them:

**1. Seed command (initial setup):**
```bash
python manage.py seed_users
```
Creates:
| Role | Email | Password |
|---|---|---|
| Admin | admin@procurement.in | Admin@123 |
| Staff | staff@procurement.in | Staff@123 |

> ⚠️ Change these before any deployment beyond local demo use.

**2. Admin UI (ongoing):** Log in as Admin → **Staff Accounts** → **+ Create Account**.

## 15. Real-Time Queue Architecture

```
React (Farmer/Staff)
      │
      │  WebSocket (JWT via query param)
      ▼
Django Channels (ASGI)
      │  JWTAuthMiddleware validates token → loads MongoDB user
      ▼
QueueConsumer / NotificationConsumer
      │  joins a group: slot_queue_<id> or user_notifications_<id>
      ▼
Redis (channel layer — message bus for group broadcast)
```

When staff call the next farmer, `queue_management/services.py` performs the atomic MongoDB update, then calls `broadcast_queue_update()`, which pushes to every socket in that slot's group via Redis — instantly updating both the staff Queue Control screen and every relevant farmer's dashboard, with no polling.

## 16. Database Design Overview

MongoDB collections (accessed via PyMongo, no ORM):

| Collection | Purpose | Key Indexes |
|---|---|---|
| `users` | Login credentials, all roles | unique `email`, unique `phone`, `role` |
| `farmers` | Farmer profile (village, district, etc.) | unique `user_id` |
| `staff` | Staff centre assignment | unique `user_id` |
| `procurement_centres` | Centre details | `name`, `is_active` |
| `slots` | Time-bound booking windows | compound `centre_id+date`, unique `centre_id+date+start_time` |
| `bookings` | Farmer-slot bookings, tokens, queue position | unique `slot_id+token_number`, compound queue index |
| `procurements` | Crop/quantity/price records | unique `booking_id` |
| `payments` | Payment status per procurement | unique `procurement_id`, sparse unique `transaction_id` |
| `notifications` | Per-user notification feed | compound `user_id+created_at` |
| `counters` | Atomic sequence generator (tokens) | unique `key` |
| `token_blacklist` | Revoked refresh tokens | unique `jti`, TTL on `expires_at` |

Relationships are maintained via `ObjectId` references (no foreign-key enforcement at the database level — referential safety, e.g. blocking deletion of a centre with active slots, is enforced in the application's service layer). Concurrency-critical operations (seat reservation, token generation, queue advancement) use MongoDB's atomic `find_one_and_update` rather than read-then-write, eliminating race conditions without multi-document transactions.

## 17. Testing Instructions

See Step 16's full regression checklist for the complete manual test pass. Quick smoke test:

```bash
# Backend health
curl http://127.0.0.1:8000/api/health/
curl http://127.0.0.1:8000/api/db-health/

# Full flow: register → book → call → procure → pay
# (see Step 16, Part C for the complete checklist)
```

Pre-demo reset:
```bash
python manage.py init_db && python manage.py check_indexes && python manage.py seed_users
```

## 18. Future Enhancements

- SMS/email notifications alongside in-app ones (e.g. via Twilio/SendGrid)
- Real payment gateway integration (Razorpay/UPI) — current payment module is record-tracking only, as scoped
- API rate limiting (DRF throttling) — not configured in this build, documented as a scope boundary
- Multi-language support for regional farmer accessibility
- Automated testing suite (pytest for backend, Vitest/RTL for frontend) — this build relied on structured manual testing
- Analytics dashboard with historical trend charts
- Offline-first PWA support for low-connectivity rural areas
- Multi-database read replicas for scaling beyond a single MongoDB instance

---

## License

Developed as a college major project. Free to use and modify for educational purposes.