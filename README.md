# Ticketify - High-Demand Ticket Booking System

Ticketify is a full-stack ticket booking system for high-demand movies and concerts built with Express, React (Vite), and Prisma (SQLite). It implements concurrent seat locks, real-time map synchronization via WebSockets, automatic waitlist reallocation on cancellations, and QR-code ticket delivery.

---

## Technical Architecture

* **Backend**: Express.js with TypeScript and WS (WebSockets)
* **Frontend**: React SPA, TypeScript, Vite, Vanilla CSS
* **Database**: Prisma ORM with SQLite
* **Email & QR Codes**: Nodemailer with Ethereal Email auto-provisioning; QRCode library
* **Concurrency**: Pessimistic/serializable transactions via Prisma on SQLite database locks

---

## Project Structure

```text
ticket-booking-system/
├── backend/
│   ├── prisma/             # Schema definitions and seed scripts
│   ├── src/
│   │   ├── config/         # Prisma client and Nodemailer transports
│   │   ├── controllers/    # API endpoint request-response routing
│   │   ├── middleware/     # JWT authentication and authorization
│   │   ├── services/       # Concurrency hold, waitlist reallocations, email delivery
│   │   └── index.ts        # Express entry point and WebSocket server
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Visual seat maps, timers, headers
│   │   ├── context/        # Auth state and API fetch wrappers
│   │   ├── pages/          # Login, browsing, checkout, dashboards
│   │   └── main.tsx
│   └── tsconfig.json
├── SYSTEM_DESIGN.md        # Technical design details
└── package.json            # Root monorepo scripts
```

---

## Setup Guide

### 1. Prerequisites
Ensure you have **Node.js (v20+)** and **npm** installed.

### 2. Installation
From the project root directory, run:
```bash
npm run install:all
```
This single command installs the required npm dependencies in the root, `backend`, and `frontend` folders.

### 3. Database Initialization & Seeding
Set up the SQLite database and seed initial mock users and event data:
```bash
cd backend
npx prisma db push
npx ts-node prisma/seed.ts
cd ..
```
*This seeds the system with demo logins for Customers, Organizers, and Admins.*

### 4. Running the Application Locally
Run the backend API and frontend Vite servers concurrently from the root directory:
```bash
npm run dev
```
* **Frontend Server**: http://localhost:3000
* **Backend API / WebSocket Server**: http://localhost:5000

---

## Demo Credentials
The login page features "Quick Demo Login" buttons to easily sign in with these pre-seeded roles:

| Role | Email | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@ticketify.com` | `password123` | Create new Venues with custom seat layouts |
| **Organizer** | `organizer@ticketify.com` | `password123` | Create Events, adjust ticket prices, and view sales/revenue charts |
| **Customer 1** | `customer1@gmail.com` | `password123` | Browse events, hold/book seats, join waitlist, cancel bookings |
| **Customer 2** | `customer2@gmail.com` | `password123` | Test real-time seat lock conflicts and waitlist escalations side-by-side |

---

## API Documentation

### Authentication
* `POST /api/auth/register` - Create user (roles: `CUSTOMER`, `ORGANIZER`, `ADMIN`).
* `POST /api/auth/login` - Sign in and receive JWT.
* `GET /api/auth/profile` - Fetch profile from JWT payload.

### Venues
* `POST /api/venues` - Create a venue layout (Admin only).
* `GET /api/venues` - Fetch all venues.

### Events
* `POST /api/events` - Create event listing and category pricings (Organizer/Admin only).
* `GET /api/events` - List events with venue descriptions.
* `GET /api/events/:id` - Fetch event details and seat map statuses.

### Bookings & Holds
* `POST /api/bookings/hold` - Place a time-limited checkout hold on seats (Customer only).
* `POST /api/bookings/confirm` - Complete payment and issue tickets (Customer only).
* `POST /api/bookings/cancel/:bookingId` - Cancel booking and trigger waitlist reallocation (Customer/Organizer/Admin).
* `GET /api/bookings/history` - User's booking history.
* `GET /api/bookings/stats/:eventId` - Event analytics ledger and summaries (Organizer/Admin only).

### Waitlist
* `POST /api/waitlist/join` - Join waitlist for standard or premium category on sold-out show.
* `GET /api/waitlist/status/:eventId` - Fetch waitlist position or claim details.

---

## Verification & Concurrency Tests

To run the automated concurrency integration test:
```bash
cd backend
npx ts-node src/test-concurrency.ts
```
This script spawns 5 concurrent customers attempting to lock the exact same seat simultaneously. It asserts that exactly one request succeeds and the other 4 are blocked, proving our transaction isolation locks function correctly.
