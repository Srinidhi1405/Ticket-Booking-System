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

export async function updateVenue(req: Request, res: Response) {
  const { id } = req.params;
  const { name, address, rows, cols, premiumRows = 2 } = req.body;

  try {
    const existingVenue = await prisma.venue.findUnique({
      where: { id },
      include: { events: true },
    });

    if (!existingVenue) {
      return res.status(404).json({ error: 'Venue not found.' });
    }

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;
    if (address) dataToUpdate.address = address;

    const isDimensionChange = (rows && parseInt(rows) !== existingVenue.rows) || 
                              (cols && parseInt(cols) !== existingVenue.cols);

    if (isDimensionChange) {
      if (existingVenue.events.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot update layout dimensions (rows/cols) for a venue that already has scheduled events.' 
        });
      }
      dataToUpdate.rows = parseInt(rows);
      dataToUpdate.cols = parseInt(cols);
    }

    const updatedVenue = await prisma.venue.update({
      where: { id },
      data: dataToUpdate,
    });

    if (isDimensionChange || premiumRows) {
      if (existingVenue.events.length === 0) {
        // Delete old seats
        await prisma.seat.deleteMany({ where: { venueId: id } });

        // Generate new seats
        const seatsData = [];
        const rCount = rows ? parseInt(rows) : existingVenue.rows;
        const cCount = cols ? parseInt(cols) : existingVenue.cols;
        
        for (let r = 1; r <= rCount; r++) {
          for (let c = 1; c <= cCount; c++) {
            seatsData.push({
              venueId: id,
              row: r,
              number: c,
              category: r <= parseInt(premiumRows) ? 'Premium' : 'Standard',
            });
          }
        }
        await Promise.all(
          seatsData.map((seat) => prisma.seat.create({ data: seat }))
        );
      }
    }

    return res.json(updatedVenue);
  } catch (error) {
    console.error('Error updating venue:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
