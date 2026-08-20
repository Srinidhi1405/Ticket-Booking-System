import { prisma } from '../config/db';
import { reallocateSeat, releaseExpiredWaitlistOffers } from './waitlistService';
import { bookingEvents } from './bookingService';

let intervalId: NodeJS.Timeout | null = null;

export async function cleanupExpiredHolds() {
  const now = new Date();

  // 1. First, process expired waitlist offers (which are a specific kind of hold)
  await releaseExpiredWaitlistOffers();

  // 2. Next, process any other expired seat holds
  // These are holds where status = 'HELD' and expiresAt < now
  const expiredHolds = await prisma.seatStatus.findMany({
    where: {
      status: 'HELD',
      expiresAt: {
        lt: now,
      },
    },
    include: {
      seat: true,
    },
  });

  if (expiredHolds.length === 0) return;

  console.log(`Processing ${expiredHolds.length} expired regular seat holds...`);

  for (const hold of expiredHolds) {
    try {
      await prisma.$transaction(async (tx) => {
        // Double check status in tx
        const current = await tx.seatStatus.findUnique({
          where: { id: hold.id },
        });

        if (current && current.status === 'HELD' && current.expiresAt && current.expiresAt < now) {
          // Revert to AVAILABLE
          await tx.seatStatus.update({
            where: { id: hold.id },
            data: {
              status: 'AVAILABLE',
              heldByUserId: null,
              heldAt: null,
              expiresAt: null,
            },
          });

          // Emit seat change event
          bookingEvents.emit('seatChange', {
            eventId: hold.eventId,
            seatId: hold.seatId,
            status: 'AVAILABLE',
            heldByUserId: null,
            expiresAt: null,
          });
        }
      });

      // Try to reallocate this seat if there is a waitlist
      await reallocateSeat(hold.eventId, hold.seatId, hold.seat.category);
    } catch (err) {
      console.error(`Error cleaning up expired hold ${hold.id}:`, err);
    }
  }
}

export function startScheduler(intervalMs: number = 10000) {
  if (intervalId) return;

  console.log(`Starting background scheduler (running every ${intervalMs / 1000}s)...`);
  intervalId = setInterval(async () => {
    try {
      await cleanupExpiredHolds();
    } catch (err) {
      console.error('Error in cleanup scheduler run:', err);
    }
  }, intervalMs);
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Background scheduler stopped.');
  }
}
