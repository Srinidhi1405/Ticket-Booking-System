import express from 'express';
import cors from 'cors';
import * as http from 'http';
import * as url from 'url';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import * as dotenv from 'dotenv';

// Load Env variables
dotenv.config();

import { initEmailTransporter } from './config/email';
import { startScheduler } from './services/scheduler';
import { bookingEvents } from './services/bookingService';
import { authenticateJWT, requireRole } from './middleware/auth';

// Controllers
import * as authController from './controllers/authController';
import * as venueController from './controllers/venueController';
import * as eventController from './controllers/eventController';
import * as bookingController from './controllers/bookingController';
import * as waitlistController from './controllers/waitlistController';

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS and body parsing
app.use(cors());
app.use(express.json());

// Serving frontend in production
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Define Routes
// Auth
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/profile', authenticateJWT, authController.getProfile);

// Venues (Admin only for creation/updating, authenticated for fetching)
app.post('/api/venues', authenticateJWT, requireRole(['ADMIN']), venueController.createVenue);
app.put('/api/venues/:id', authenticateJWT, requireRole(['ADMIN']), venueController.updateVenue);
app.get('/api/venues', authenticateJWT, venueController.getVenues);

// Events
app.post('/api/events', authenticateJWT, requireRole(['ADMIN', 'ORGANIZER']), eventController.createEvent);
app.get('/api/events', eventController.getEvents);
app.get('/api/events/:id', eventController.getEventDetails);

// Bookings & Holds
app.post('/api/bookings/hold', authenticateJWT, bookingController.createHold);
app.post('/api/bookings/confirm', authenticateJWT, bookingController.confirmBooking);
app.post('/api/bookings/cancel/:bookingId', authenticateJWT, bookingController.cancelBooking);
app.get('/api/bookings/history', authenticateJWT, bookingController.getHistory);
app.get('/api/bookings/stats/:eventId', authenticateJWT, requireRole(['ADMIN', 'ORGANIZER']), bookingController.getEventStats);

// Waitlists
app.post('/api/waitlist/join', authenticateJWT, waitlistController.join);
app.get('/api/waitlist/status/:eventId', authenticateJWT, waitlistController.getStatus);

// Fallback error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Catch-all route to serve React app for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Create HTTP Server
const server = http.createServer(app);

// Create WebSocket Server
const wss = new WebSocketServer({ noServer: true });

// Custom interface for WebSocket clients to track subscription
interface EventWebSocket extends WebSocket {
  eventId?: string;
  isAlive?: boolean;
}

// Upgrade HTTP to WS
server.on('upgrade', (request, socket, head) => {
  const parsedUrl = url.parse(request.url || '');
  const pathname = parsedUrl.pathname;

  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Handle WebSocket connection
wss.on('connection', (ws: EventWebSocket) => {
  console.log('WS Client connected.');
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'subscribe') {
        const { eventId } = data;
        ws.eventId = eventId;
        console.log(`WS Client subscribed to seat updates for event: ${eventId}`);
        
        // Confirm subscription
        ws.send(JSON.stringify({ type: 'subscribed', eventId }));
      }
    } catch (err) {
      console.error('WS Message parsing error:', err);
    }
  });

  ws.on('close', () => {
    console.log('WS Client disconnected.');
  });
});

// Heartbeat ping interval to keep WS connections alive and clean dead sockets
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws: EventWebSocket) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// Listen to service seat updates and broadcast to subscribed clients
bookingEvents.on('seatChange', ({ eventId, seatId, status, heldByUserId, expiresAt }) => {
  const updatePayload = JSON.stringify({
    type: 'seat_update',
    seatId,
    status,
    heldByUserId,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  });

  let broadcastCount = 0;
  wss.clients.forEach((client: EventWebSocket) => {
    if (client.readyState === WebSocket.OPEN && client.eventId === eventId) {
      client.send(updatePayload);
      broadcastCount++;
    }
  });

  if (broadcastCount > 0) {
    console.log(`[WS Broadcast] Sent seat update for event ${eventId}: Seat ${seatId} -> ${status} to ${broadcastCount} client(s).`);
  }
});

// Boot backend
async function bootstrap() {
  // Initialize email credentials
  await initEmailTransporter();

  // Start checking for expired holds
  startScheduler(10000);

  server.listen(port, () => {
    console.log(`🚀 Ticket Booking Backend running on port ${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to boot backend:', err);
  process.exit(1);
});
