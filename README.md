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
=======
# 🎟️ Ticketify — High-Demand Ticket Booking System

Ticketify is a full-stack ticket booking platform designed to handle **high-demand events** such as concerts and movies.

The system focuses on solving real-world ticketing challenges including **concurrent seat booking, temporary seat holds, booking expiration, automatic waitlist allocation, real-time seat synchronization, and digital ticket delivery through QR codes**.

---

## 🚀 Key Features

### 👤 Role-Based Access

The system supports three user roles:

* **Customer** — Browse events, select seats, book tickets, cancel bookings, and join waitlists.
* **Organizer** — Create and manage events, configure ticket pricing, and view booking analytics.
* **Admin** — Manage venues and seat layouts.

### 💺 Real-Time Seat Booking

* Interactive seat map
* Live seat availability
* Temporary seat holds during checkout
* Automatic release of expired holds
* Prevention of double booking

### 🔒 Concurrent Booking Protection

Ticketify is designed for high-demand scenarios where multiple users may attempt to book the same seat simultaneously.

The booking service uses database transactions to ensure that:

* Only one customer can successfully hold a seat.
* Conflicting requests are rejected.
* Seat state transitions remain consistent.
* Partial bookings are rolled back when validation fails.

A dedicated concurrency test is included to simulate multiple users attempting to reserve the same seat simultaneously.

### ⏱️ Time-Limited Seat Holds

Seats selected during checkout are temporarily held for a limited period.

The background scheduler:

1. Detects expired holds.
2. Releases the seats.
3. Updates their availability.
4. Triggers the waitlist allocation process when required.

### 📋 Automated Waitlist

When an event or seat category is sold out, customers can join a waitlist.

When a seat becomes available:

1. The next eligible customer is selected.
2. The seat is temporarily assigned to them.
3. A limited-time offer is created.
4. An email notification is sent.
5. If the customer does not complete the booking, the offer expires.
6. The seat is automatically offered to the next customer.

### 📧 Email Notifications

Nodemailer is used to handle email delivery for ticket and waitlist notifications.

Ethereal Email can be automatically provisioned for development and testing.

### 🎫 QR Code Tickets

Confirmed bookings generate QR-code ticket information that can be delivered to the customer through email.

### 📊 Dashboards

The application includes dedicated dashboards for:

* Customers
* Organizers
* Administrators

Organizers can view event-level booking and revenue information.

---

## 📂 Project Structure

```text
ticket-booking-system/
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── services/
│       └── index.ts
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       ├── App.tsx
│       └── main.tsx
│
├── SYSTEM_DESIGN.md
├── package.json
└── README.md

```

## 🔐 Demo Accounts

The database seed script provides demo accounts for testing.

| Role      | Email                     | Password      |
| --------- | ------------------------- | ------------- |
| Admin     | `admin@ticketify.com`     | `password123` |
| Organizer | `organizer@ticketify.com` | `password123` |
| Customer  | `customer1@gmail.com`     | `password123` |
| Customer  | `customer2@gmail.com`     | `password123` |

The two customer accounts can be used to test concurrent booking and seat-locking behaviour.

---

## 🔌 API Endpoints

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile
```

### Venues

```text
POST /api/venues
GET  /api/venues
```

### Events

```text
POST /api/events
GET  /api/events
GET  /api/events/:id
```

### Bookings

```text
POST /api/bookings/hold
POST /api/bookings/confirm
POST /api/bookings/cancel/:bookingId
GET  /api/bookings/history
GET  /api/bookings/stats/:eventId
```

### Waitlist

```text
POST /api/waitlist/join
GET  /api/waitlist/status/:eventId
```

---

## 🔄 Booking Flow

```text
Browse Events
      │
      ▼
Select Event
      │
      ▼
Select Seats
      │
      ▼
Temporary Seat Hold
      │
      ├──── Hold expires ────► Release Seat
      │
      ▼
Checkout
      │
      ▼
Confirm Booking
      │
      ▼
Generate Ticket
      │
      ▼
Generate QR Code
      │
      ▼
Send Ticket Email
```

---

## 📋 Waitlist Flow

```text
Event / Category Sold Out
          │
          ▼
     Join Waitlist
          │
          ▼
    Customer Queued
          │
          ▼
     Seat Released
          │
          ▼
Next Customer Selected
          │
          ▼
    Limited-Time Offer
          │
       ┌──┴──┐
       │     │
    Accept  Expire
       │     │
       ▼     ▼
   Booking  Next User
   Confirmed  Offered
```

---

## 🔒 Concurrency Testing

A dedicated concurrency test is available in:

```text
backend/src/test-concurrency.ts
```

Run it using:

>>>>>>> 84c55b3e44d9b2eaa2d5db193e105ae7665d7d86
```bash
cd backend
npx ts-node src/test-concurrency.ts
```
<<<<<<< HEAD
This script spawns 5 concurrent customers attempting to lock the exact same seat simultaneously. It asserts that exactly one request succeeds and the other 4 are blocked, proving our transaction isolation locks function correctly.
=======

The test simulates multiple customers attempting to hold the **same seat at the same time**.

Expected behaviour:

```text
5 concurrent booking attempts
          │
          ▼
    Same seat requested
          │
          ▼
 ┌─────────────────────┐
 │ Transaction control │
 └──────────┬──────────┘
            │
            ▼
   1 request succeeds
   4 requests rejected
```

This demonstrates the system's protection against double booking and race conditions.

---

## 🧠 Database Design

The main entities include:

```text
User
 │
 ├── Booking
 ├── SeatStatus
 ├── Waitlist
 └── Event

Venue
 │
 └── Seat
       │
       ├── SeatStatus
       └── BookingItem

Event
 │
 ├── SeatCategoryPricing
 ├── SeatStatus
 ├── Booking
 └── Waitlist
```

The database is managed using **Prisma ORM** with SQLite for local development.

---

## ⏱️ Background Scheduler

Ticketify includes an in-memory scheduler that periodically checks for:

* Expired seat holds
* Expired waitlist offers

Expired seats are released automatically, while available seats can trigger the waitlist reallocation process.

---

## 🔮 Future Improvements

Potential improvements include:

* PostgreSQL production deployment
* Redis-based distributed seat locking
* Redis/WebSocket-based scalable real-time synchronization
* Payment gateway integration
* Docker deployment
* Cloud database support
* Kubernetes deployment
* Admin analytics dashboard
* Ticket QR-code verification
* Push notifications
* Event search and filtering
* Production-grade distributed job queues

---

## 📌 Project Highlights

This project demonstrates practical implementation of:

* Full-stack web development
* REST API design
* React application development
* TypeScript
* Database modelling
* Prisma ORM
* JWT authentication
* Role-based authorization
* WebSockets
* Transaction management
* Concurrency handling
* Seat reservation systems
* Waitlist algorithms
* Background scheduling
* QR-code generation
* Email automation

---
>>>>>>> 84c55b3e44d9b2eaa2d5db193e105ae7665d7d86
