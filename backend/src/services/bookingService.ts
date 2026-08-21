import { prisma } from '../config/db';
import { EventEmitter } from 'events';
import { sendTicketEmail } from './emailService';
import { reallocateSeat } from './waitlistService';

export const bookingEvents = new EventEmitter();

// Helper to generate a unique booking reference
function generateBookingRef(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'TKT-';
  for (let i = 0; i < 6; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

export async function holdSeats(userId: string, eventId: string, seatIds: string[], ttlMinutes: number = 10) {
  return await prisma.$transaction(async (tx) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    const result = await tx.seatStatus.updateMany({
      where: {
        eventId,
        seatId: { in: seatIds },
        OR: [
          { status: 'AVAILABLE' },
          {
            status: 'HELD',
            expiresAt: { lt: now },
          },
          {
            status: 'HELD',
            heldByUserId: userId,
          },
        ],
      },
      data: {
        status: 'HELD',
        heldByUserId: userId,
        heldAt: now,
        expiresAt,
      },
    });

    if (result.count !== seatIds.length) {
      throw new Error('Some of the selected seats are already booked or held by another customer.');
    }

    for (const seatId of seatIds) {
      bookingEvents.emit('seatChange', {
        eventId,
        seatId,
        status: 'HELD',
        heldByUserId: userId,
        expiresAt,
      });
    }

    return seatIds.map(seatId => ({
      eventId,
      seatId,
      status: 'HELD',
      heldByUserId: userId,
      expiresAt,
    }));
  });
}

export async function confirmBooking(userId: string, eventId: string, seatIds: string[]) {
  const booking = await prisma.$transaction(async (tx) => {
    const now = new Date();

    const result = await tx.seatStatus.updateMany({
      where: {
        eventId,
        seatId: { in: seatIds },
        status: 'HELD',
        heldByUserId: userId,
        expiresAt: { gte: now },
      },
      data: {
        status: 'BOOKED',
        heldByUserId: null,
        heldAt: null,
        expiresAt: null,
      },
    });

    if (result.count !== seatIds.length) {
      throw new Error('Hold expired or invalid. Please select seats and try again.');
    }

    const seats = await tx.seat.findMany({
      where: { id: { in: seatIds } },
    });

    const pricings = await tx.seatCategoryPricing.findMany({
      where: { eventId },
    });

    let totalPrice = 0;
    for (const seat of seats) {
      const pricing = pricings.find((p) => p.category === seat.category);
      if (!pricing) {
        throw new Error(`Pricing not found for category: ${seat.category}`);
      }
      totalPrice += pricing.price;
    }

    const bookingRef = generateBookingRef();
    const newBooking = await tx.booking.create({
      data: {
        eventId,
        userId,
        totalPrice,
        status: 'CONFIRMED',
        bookingReference: bookingRef,
        bookingItems: {
          create: seatIds.map((seatId) => ({ seatId })),
        },
      },
      include: {
        event: true,
        user: true,
      },
    });

    for (const seatId of seatIds) {
      bookingEvents.emit('seatChange', {
        eventId,
        seatId,
        status: 'BOOKED',
        heldByUserId: null,
        expiresAt: null,
      });
    }

    await tx.waitlist.updateMany({
      where: {
        eventId,
        userId,
        status: { in: ['OFFERED', 'WAITING'] },
      },
      data: {
        status: 'COMPLETED',
      },
    });

    return newBooking;
  });

  // Send Ticket Email asynchronously
  const seatNames = await prisma.seat.findMany({
    where: { id: { in: seatIds } },
  });
  const seatLabels = seatNames.map((s) => `Row ${s.row}-Col ${s.number}`);

  // Format date/time
  const dateStr = booking.event.date.toLocaleDateString();
  const timeStr = booking.event.time;

  sendTicketEmail(
    booking.user.email,
    booking.user.name,
    booking.bookingReference,
    booking.event.title,
    dateStr,
    timeStr,
    seatLabels
  ).catch(console.error);

  return booking;
}

export async function cancelBooking(userId: string, bookingId: string, isAdminOrOrganizer: boolean = false) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch booking
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: {
          include: {
            seat: true,
          },
        },
        event: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    // Check ownership
    if (!isAdminOrOrganizer && booking.userId !== userId) {
      throw new Error('Unauthorized to cancel this booking.');
    }

    if (booking.status !== 'CONFIRMED') {
      throw new Error('Booking cannot be cancelled as it is already ' + booking.status);
    }

    // 2. Mark booking as CANCELLED
    const cancelledBooking = await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });

    const seatIds = booking.bookingItems.map((item) => item.seatId);

    // 3. Reset SeatStatuses to AVAILABLE
    for (const item of booking.bookingItems) {
      await tx.seatStatus.update({
        where: {
          eventId_seatId: { eventId: booking.eventId, seatId: item.seatId },
        },
        data: {
          status: 'AVAILABLE',
          heldByUserId: null,
          heldAt: null,
          expiresAt: null,
        },
      });

      // Emit event for real-time broadcast
      bookingEvents.emit('seatChange', {
        eventId: booking.eventId,
        seatId: item.seatId,
        status: 'AVAILABLE',
        heldByUserId: null,
        expiresAt: null,
      });
    }

    return { cancelledBooking, seatIds, eventId: booking.eventId, bookingItems: booking.bookingItems };
  });

  // 4. Trigger waitlist reallocation for each cancelled seat
  for (const item of result.bookingItems) {
    await reallocateSeat(result.eventId, item.seatId, item.seat.category);
  }

  return result.cancelledBooking;
}
