import { Request, Response } from 'express';
import { prisma } from '../config/db';
import * as bookingService from '../services/bookingService';

export async function createHold(req: Request, res: Response) {
  const { eventId, seatIds, ttlMinutes = 10 } = req.body;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  if (!eventId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({ error: 'EventId and an array of seatIds are required.' });
  }

  try {
    const holds = await bookingService.holdSeats(req.user.id, eventId, seatIds, parseInt(ttlMinutes as string));
    return res.status(201).json({ message: 'Seats held successfully.', holds });
  } catch (error: any) {
    console.error('Error holding seats:', error);
    return res.status(400).json({ error: error.message || 'Failed to place hold on seats.' });
  }
}

export async function confirmBooking(req: Request, res: Response) {
  const { eventId, seatIds } = req.body;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  if (!eventId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({ error: 'EventId and an array of seatIds are required.' });
  }

  try {
    const booking = await bookingService.confirmBooking(req.user.id, eventId, seatIds);
    return res.status(201).json({ message: 'Booking confirmed successfully.', booking });
  } catch (error: any) {
    console.error('Error confirming booking:', error);
    return res.status(400).json({ error: error.message || 'Failed to complete booking.' });
  }
}

export async function cancelBooking(req: Request, res: Response) {
  const { bookingId } = req.params;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const isAdminOrOrganizer = ['ADMIN', 'ORGANIZER'].includes(req.user.role);

  try {
    const cancelled = await bookingService.cancelBooking(req.user.id, bookingId, isAdminOrOrganizer);
    return res.json({ message: 'Booking cancelled and seats reallocated.', booking: cancelled });
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    return res.status(400).json({ error: error.message || 'Failed to cancel booking.' });
  }
}

export async function getHistory(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.id },
      include: {
        event: {
          include: {
            venue: true,
          },
        },
        bookingItems: {
          include: {
            seat: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(bookings);
  } catch (error) {
    console.error('Error fetching booking history:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function getEventStats(req: Request, res: Response) {
  const { eventId } = req.params;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    // Verify Event ownership
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (req.user.role === 'ORGANIZER' && event.organizerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You do not own this event.' });
    }

    // Calculations
    const seatStatuses = await prisma.seatStatus.findMany({
      where: { eventId },
      include: { seat: true },
    });

    const now = new Date();
    let bookedCount = 0;
    let heldCount = 0;
    let availableCount = 0;

    for (const s of seatStatuses) {
      if (s.status === 'BOOKED') {
        bookedCount++;
      } else if (s.status === 'HELD' && s.expiresAt && s.expiresAt >= now) {
        heldCount++;
      } else {
        availableCount++;
      }
    }

    // Total confirmed bookings and revenue
    const bookings = await prisma.booking.findMany({
      where: { eventId, status: 'CONFIRMED' },
      include: {
        user: { select: { name: true, email: true } },
        bookingItems: { include: { seat: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);

    // Sales by seat category
    const categoryStats: Record<string, { booked: number; revenue: number }> = {};
    for (const b of bookings) {
      for (const item of b.bookingItems) {
        const cat = item.seat.category;
        if (!categoryStats[cat]) {
          categoryStats[cat] = { booked: 0, revenue: 0 };
        }
        
        // Find price for this category
        const pricing = await prisma.seatCategoryPricing.findUnique({
          where: { eventId_category: { eventId, category: cat } }
        });
        const price = pricing ? pricing.price : 0;
        
        categoryStats[cat].booked += 1;
        categoryStats[cat].revenue += price;
      }
    }

    // Waitlist sizes
    const waitlistWaiting = await prisma.waitlist.count({
      where: { eventId, status: 'WAITING' },
    });
    const waitlistOffered = await prisma.waitlist.count({
      where: { eventId, status: 'OFFERED' },
    });

    return res.json({
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
      },
      summary: {
        totalSeats: seatStatuses.length,
        booked: bookedCount,
        held: heldCount,
        available: availableCount,
        revenue: totalRevenue,
      },
      categoryStats,
      waitlist: {
        waiting: waitlistWaiting,
        offered: waitlistOffered,
        total: waitlistWaiting + waitlistOffered,
      },
      bookings: bookings.map((b) => ({
        id: b.id,
        reference: b.bookingReference,
        customerName: b.user.name,
        customerEmail: b.user.email,
        seats: b.bookingItems.map((item) => `Row ${item.seat.row}-Col ${item.seat.number}`).join(', '),
        price: b.totalPrice,
        createdAt: b.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching event statistics:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
