# 🎟️ Ticketify — Premium Ticket Booking System

**Ticketify** is a full-stack ticket booking platform designed for high-demand events such as concerts, movies, and live shows.

The system provides **real-time seat availability, temporary seat locking, concurrent booking protection, automated waitlist allocation, QR-code tickets, email notifications, and role-based dashboards**.

🔗 **Live Application:** https://ticket-booking-system-rp93.onrender.com/

---

## ✨ Features

### 👤 Role-Based Authentication

Ticketify supports multiple user roles:

* 👨‍💼 **Admin** — Manage venues and seat layouts
* 🎤 **Organizer** — Create events, configure pricing, and monitor bookings
* 🎟️ **Customer** — Browse events, select seats, book tickets, cancel bookings, and join waitlists

### 💺 Real-Time Seat Booking

* Interactive seat map
* Real-time seat availability
* Temporary seat holds
* Automatic expiration of unused holds
* Prevention of double booking
* Booking confirmation workflow

### 🔒 Concurrent Booking Protection

Ticketify is designed to handle multiple users attempting to reserve the same seat simultaneously.

Database transactions ensure that:

* A seat cannot be successfully booked by multiple users.
* Conflicting booking requests are rejected.
* Seat states remain consistent.
* Failed transactions are rolled back.

### ⏱️ Temporary Seat Holds

When a customer selects a seat, it is temporarily locked.

If the customer does not complete the booking within the allowed time:

```text
Seat Hold
   ↓
Timer Expires
   ↓
Seat Released
   ↓
Seat Available Again
```

### 📋 Automated Waitlist

When an event or category is sold out, customers can join the waitlist.

When a seat becomes available:

```text
Seat Released
      ↓
Next Eligible Customer
      ↓
Temporary Offer
      ↓
Customer Accepts
      ↓
Booking Confirmed
```

If the offer expires, the seat is automatically offered to the next eligible customer.

### 🎫 Digital QR Tickets

Confirmed bookings generate digital ticket information with QR-code support.

Customers can use the generated ticket for event verification.

### 📧 Email Notifications

The backend supports email notifications for:

* Booking confirmation
* Ticket delivery
* Waitlist offers
* Waitlist updates

### 📊 Dashboards

Different dashboards are provided based on user roles.

**Customer Dashboard**

* Upcoming bookings
* Booking history
* Tickets
* Waitlist status

**Organizer Dashboard**

* Event management
* Ticket sales
* Revenue information
* Booking statistics

**Admin Dashboard**

* Venue management
* Seat configuration
* System administration
              
                 

---

# 🔄 Booking Flow

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
      ├──────────────► Hold Expires
      │                      │
      │                      ▼
      │                Seat Released
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
Send Confirmation
```

---

# 🔐 Concurrency Handling

One of the main objectives of Ticketify is preventing **double booking during high-demand events**.

For example, if multiple users attempt to reserve the same seat:

```text
User 1 ─────┐
User 2 ─────┤
User 3 ─────┼──► Same Seat
User 4 ─────┤
User 5 ─────┘
                │
                ▼
        Database Transaction
                │
        ┌───────┴────────┐
        ▼                ▼
   One succeeds     Others rejected
        │
        ▼
   Seat Reserved
```

This approach helps maintain consistent seat availability even when multiple booking requests arrive simultaneously.

---

# 📋 Waitlist Architecture

```text
             Event Sold Out
                   │
                   ▼
             Join Waitlist
                   │
                   ▼
             Queue Customer
                   │
                   ▼
             Seat Released
                   │
                   ▼
        Select Next Eligible User
                   │
                   ▼
          Create Limited Offer
                   │
            ┌──────┴──────┐
            │             │
            ▼             ▼
        Accepted       Expired
            │             │
            ▼             ▼
      Confirm Booking   Next User
```

---

# 📁 Project Structure

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

---

# 🔑 Demo Accounts

For local development, the seeded database provides demo users.

| Role      | Email                     | Password      |
| --------- | ------------------------- | ------------- |
| Admin     | `admin@ticketify.com`     | `password123` |
| Organizer | `organizer@ticketify.com` | `password123` |
| Customer  | `customer1@gmail.com`     | `password123` |
| Customer  | `customer2@gmail.com`     | `password123` |

> Change demo credentials before using the application in a production environment.

---

# 🔌 API Overview

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile
```

## Events

```text
POST /api/events
GET  /api/events
GET  /api/events/:id
```

## Venues

```text
POST /api/venues
GET  /api/venues
```

## Bookings

```text
POST /api/bookings/hold
POST /api/bookings/confirm
POST /api/bookings/cancel/:bookingId
GET  /api/bookings/history
GET  /api/bookings/stats/:eventId
```

## Waitlist

```text
POST /api/waitlist/join
GET  /api/waitlist/status/:eventId
```

---

# 🧪 Concurrency Testing

The project includes a concurrency test to simulate multiple users attempting to reserve the same seat.

Example:

```bash
cd backend

npx ts-node src/test-concurrency.ts
```

The test demonstrates how the booking system handles simultaneous requests for a single seat.

Expected concept:

```text
Multiple Requests
       │
       ▼
Same Seat
       │
       ▼
Transaction Handling
       │
       ├──► Request 1 → SUCCESS
       │
       ├──► Request 2 → REJECTED
       ├──► Request 3 → REJECTED
       ├──► Request 4 → REJECTED
       └──► Request 5 → REJECTED
```

---

# ⏰ Background Scheduler

Ticketify includes background processing for time-sensitive booking operations.

The scheduler handles:

* Expired seat holds
* Expired waitlist offers
* Seat release
* Waitlist reallocation

This allows the system to automatically recover seats that were temporarily reserved but never purchased.

---

# 🔮 Future Enhancements

*  Payment gateway integration
*  PostgreSQL production database
*  Redis distributed locking
*  Docker deployment
*  Cloud deployment
*  Push notifications
*  Event search and filtering
*  Advanced analytics
*  QR-code ticket verification
*  Enhanced security and rate limiting
*  Improved mobile responsiveness
*  Distributed WebSocket infrastructure
