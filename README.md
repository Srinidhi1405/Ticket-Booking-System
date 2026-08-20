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

```bash
cd backend
npx ts-node src/test-concurrency.ts
```

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
