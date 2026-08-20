import { Request, Response } from 'express';
import { prisma } from '../config/db';
import * as waitlistService from '../services/waitlistService';

export async function join(req: Request, res: Response) {
  const { eventId, category } = req.body;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  if (!eventId || !category) {
    return res.status(400).json({ error: 'EventId and category are required.' });
  }

  try {
    const entry = await waitlistService.joinWaitlist(req.user.id, eventId, category);
    
    // Calculate initial position
    const position = await prisma.waitlist.count({
      where: {
        eventId,
        category,
        status: 'WAITING',
        priority: { lt: entry.priority },
      },
    }) + 1;

    return res.status(201).json({
      message: 'Joined waitlist successfully.',
      entry: {
        id: entry.id,
        category: entry.category,
        status: entry.status,
        position,
      },
    });
  } catch (error: any) {
    console.error('Error joining waitlist:', error);
    return res.status(400).json({ error: error.message || 'Failed to join waitlist.' });
  }
}

export async function getStatus(req: Request, res: Response) {
  const { eventId } = req.params;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const entry = await prisma.waitlist.findFirst({
      where: {
        eventId,
        userId: req.user.id,
        status: { in: ['WAITING', 'OFFERED'] },
      },
      include: {
        offeredSeat: true,
      },
    });

    if (!entry) {
      return res.json({ onWaitlist: false });
    }

    let position = 0;
    if (entry.status === 'WAITING') {
      position = await prisma.waitlist.count({
        where: {
          eventId,
          category: entry.category,
          status: 'WAITING',
          priority: { lt: entry.priority },
        },
      }) + 1;
    }

    return res.json({
      onWaitlist: true,
      id: entry.id,
      category: entry.category,
      status: entry.status,
      position,
      offeredSeat: entry.offeredSeat
        ? {
            id: entry.offeredSeat.id,
            row: entry.offeredSeat.row,
            number: entry.offeredSeat.number,
          }
        : null,
      offerExpiresAt: entry.offerExpiresAt,
    });
  } catch (error) {
    console.error('Error getting waitlist status:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
