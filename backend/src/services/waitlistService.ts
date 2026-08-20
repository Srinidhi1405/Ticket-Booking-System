import { prisma } from '../config/db';
import { sendWaitlistOfferEmail } from './emailService';
import { bookingEvents } from './bookingService';

export async function joinWaitlist(userId: string, eventId: string, category: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Check if user already has an active waitlist entry
    const existing = await tx.waitlist.findFirst({
      where: {
        eventId,
        userId,
        category,
        status: { in: ['WAITING', 'OFFERED'] },
      },
    });

    if (existing) {
      throw new Error(`You are already on the waitlist for the ${category} category.`);
    }

    // 2. Check if they already have a booking or hold for this event
    const activeBooking = await tx.booking.findFirst({
      where: {
        eventId,
        userId,
        status: 'CONFIRMED',
      },
    });

    if (activeBooking) {
      throw new Error('You already have a confirmed booking for this event.');
    }

    // 3. Get next priority number
    const lastEntry = await tx.waitlist.findFirst({
      where: { eventId, category },
      orderBy: { priority: 'desc' },
    });

    const nextPriority = lastEntry ? lastEntry.priority + 1 : 1;

    // 4. Create waitlist entry
    const newEntry = await tx.waitlist.create({
      data: {
        eventId,
        userId,
        category,
        status: 'WAITING',
        priority: nextPriority,
      },
      include: {
        user: true,
        event: true,
      },
    });

    return newEntry;
  });
}

export async function reallocateSeat(eventId: string, seatId: string, category: string) {
  console.log(`Checking waitlist for event: ${eventId}, seat: ${seatId}, category: ${category}`);

  // We run this inside a transaction to prevent race conditions during reallocation
  const success = await prisma.$transaction(async (tx) => {
    // 1. Find the first user in line (status = WAITING)
    const nextInLine = await tx.waitlist.findFirst({
      where: {
        eventId,
        category,
        status: 'WAITING',
      },
      orderBy: {
        priority: 'asc',
      },
      include: {
        user: true,
        event: true,
      },
    });

    if (!nextInLine) {
      console.log('No users on waitlist for this seat category.');
      return false; // Nobody to allocate to
    }

    const offerTTL = 10; // 10 minutes offer TTL
    const now = new Date();
    const offerExpiresAt = new Date(now.getTime() + offerTTL * 60 * 1000);

    // 2. Place a hold on the seat for this waitlisted user
    await tx.seatStatus.update({
      where: {
        eventId_seatId: { eventId, seatId },
      },
      data: {
        status: 'HELD',
        heldByUserId: nextInLine.userId,
        heldAt: now,
        expiresAt: offerExpiresAt,
      },
    });

    // 3. Update the waitlist entry
    await tx.waitlist.update({
      where: { id: nextInLine.id },
      data: {
        status: 'OFFERED',
        offeredAt: now,
        offerExpiresAt,
        offeredSeatId: seatId,
      },
    });

    // Emit event for real-time broadcast of seat status
    bookingEvents.emit('seatChange', {
      eventId,
      seatId,
      status: 'HELD',
      heldByUserId: nextInLine.userId,
      expiresAt: offerExpiresAt,
    });

    return {
      userId: nextInLine.userId,
      email: nextInLine.user.email,
      name: nextInLine.user.name,
      eventTitle: nextInLine.event.title,
      waitlistId: nextInLine.id,
      offerExpiresAt,
    };
  });

  if (success) {
    // Send email to the selected user outside the transaction
    const checkoutUrl = `http://localhost:3000/checkout?eventId=${eventId}&waitlistId=${success.waitlistId}`;
    sendWaitlistOfferEmail(
      success.email,
      success.name,
      success.eventTitle,
      category,
      checkoutUrl,
      10
    ).catch(console.error);

    return true;
  }

  return false;
}

export async function releaseExpiredWaitlistOffers() {
  const now = new Date();

  // Find all waitlist entries that are offered and expired
  const expiredOffers = await prisma.waitlist.findMany({
    where: {
      status: 'OFFERED',
      offerExpiresAt: {
        lt: now,
      },
    },
    include: {
      event: true,
    },
  });

  if (expiredOffers.length === 0) return;

  console.log(`Processing ${expiredOffers.length} expired waitlist offers...`);

  for (const offer of expiredOffers) {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Mark waitlist entry as EXPIRED
        await tx.waitlist.update({
          where: { id: offer.id },
          data: { status: 'EXPIRED' },
        });

        // 2. If it has an associated seat and it is still held by this user, release it
        if (offer.offeredSeatId) {
          const seatStatus = await tx.seatStatus.findUnique({
            where: {
              eventId_seatId: { eventId: offer.eventId, seatId: offer.offeredSeatId },
            },
          });

          // Check if seat is still held by this specific user
          if (
            seatStatus &&
            seatStatus.status === 'HELD' &&
            seatStatus.heldByUserId === offer.userId
          ) {
            await tx.seatStatus.update({
              where: {
                eventId_seatId: { eventId: offer.eventId, seatId: offer.offeredSeatId },
              },
              data: {
                status: 'AVAILABLE',
                heldByUserId: null,
                heldAt: null,
                expiresAt: null,
              },
            });

            // Emit seat change event
            bookingEvents.emit('seatChange', {
              eventId: offer.eventId,
              seatId: offer.offeredSeatId,
              status: 'AVAILABLE',
              heldByUserId: null,
              expiresAt: null,
            });
          }
        }
      });

      // 3. Trigger reallocation for this released seat (outside transaction to avoid nested tx issues)
      if (offer.offeredSeatId) {
        // Find seat category
        const seat = await prisma.seat.findUnique({
          where: { id: offer.offeredSeatId },
        });
        if (seat) {
          await reallocateSeat(offer.eventId, seat.id, seat.category);
        }
      }
    } catch (err) {
      console.error(`Error processing expired waitlist offer ${offer.id}:`, err);
    }
  }
}
