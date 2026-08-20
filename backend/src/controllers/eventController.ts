import { Request, Response } from 'express';
import { prisma } from '../config/db';

export async function createEvent(req: Request, res: Response) {
  const { title, description, imageUrl, date, time, venueId, pricings } = req.body;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  if (!title || !description || !date || !time || !venueId || !pricings) {
    return res.status(400).json({ error: 'Title, description, date, time, venueId, and pricings are required.' });
  }

  try {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: { seats: true },
    });

    if (!venue) {
      return res.status(404).json({ error: 'Venue not found.' });
    }

    // Create Event
    const event = await prisma.event.create({
      data: {
        title,
        description,
        imageUrl,
        date: new Date(date),
        time,
        venueId,
        organizerId: req.user.id,
      },
    });

    // Create seat category pricings
    // pricings looks like: { Premium: 120.0, Standard: 60.0 }
    const pricingPromises = Object.entries(pricings).map(([category, price]) =>
      prisma.seatCategoryPricing.create({
        data: {
          eventId: event.id,
          category,
          price: parseFloat(price as string),
        },
      })
    );
    await Promise.all(pricingPromises);

    // Initialize SeatStatus for all venue seats
    const seatStatusPromises = venue.seats.map((seat) =>
      prisma.seatStatus.create({
        data: {
          eventId: event.id,
          seatId: seat.id,
          status: 'AVAILABLE',
        },
      })
    );
    await Promise.all(seatStatusPromises);

    return res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function getEvents(req: Request, res: Response) {
  try {
    const events = await prisma.event.findMany({
      include: {
        venue: {
          select: { name: true, address: true },
        },
        pricings: true,
      },
      orderBy: { date: 'asc' },
    });
    return res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function getEventDetails(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        venue: true,
        pricings: true,
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Fetch all seats in this venue
    const seats = await prisma.seat.findMany({
      where: { venueId: event.venueId },
      orderBy: [
        { row: 'asc' },
        { number: 'asc' },
      ],
    });

    // Fetch seat statuses
    const seatStatuses = await prisma.seatStatus.findMany({
      where: { eventId: event.id },
    });

    const now = new Date();

    // Map seats with their status, resolving expirations dynamically
    const seatMap = seats.map((seat) => {
      const statusRecord = seatStatuses.find((s) => s.seatId === seat.id);
      
      let status = 'AVAILABLE';
      let heldByUserId = null;
      let expiresAt = null;

      if (statusRecord) {
        status = statusRecord.status;
        heldByUserId = statusRecord.heldByUserId;
        expiresAt = statusRecord.expiresAt;

        // If the hold has expired but hasn't been cleaned up by the background scheduler yet,
        // treat it as AVAILABLE to prevent ghost holds.
        if (status === 'HELD' && expiresAt && expiresAt < now) {
          status = 'AVAILABLE';
          heldByUserId = null;
          expiresAt = null;
        }
      }

      return {
        id: seat.id,
        row: seat.row,
        number: seat.number,
        category: seat.category,
        status,
        heldByUserId,
        expiresAt,
      };
    });

    return res.json({
      event,
      seatMap,
    });
  } catch (error) {
    console.error('Error fetching event details:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
