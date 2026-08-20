import { Request, Response } from 'express';
import { prisma } from '../config/db';

export async function createVenue(req: Request, res: Response) {
  const { name, address, rows, cols, premiumRows = 2 } = req.body;

  if (!name || !address || !rows || !cols) {
    return res.status(400).json({ error: 'Name, address, rows, and cols are required.' });
  }

  try {
    const venue = await prisma.venue.create({
      data: {
        name,
        address,
        rows: parseInt(rows),
        cols: parseInt(cols),
      },
    });

    // Generate physical seats for this venue layout
    const seatsData = [];
    for (let r = 1; r <= venue.rows; r++) {
      for (let c = 1; c <= venue.cols; c++) {
        seatsData.push({
          venueId: venue.id,
          row: r,
          number: c,
          category: r <= parseInt(premiumRows) ? 'Premium' : 'Standard',
        });
      }
    }

    // Create seats in bulk via Promise.all
    await Promise.all(
      seatsData.map((seat) =>
        prisma.seat.create({
          data: seat,
        })
      )
    );

    return res.status(201).json(venue);
  } catch (error) {
    console.error('Error creating venue:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function getVenues(req: Request, res: Response) {
  try {
    const venues = await prisma.venue.findMany({
      include: {
        _count: {
          select: { seats: true },
        },
      },
    });
    return res.json(venues);
  } catch (error) {
    console.error('Error fetching venues:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
