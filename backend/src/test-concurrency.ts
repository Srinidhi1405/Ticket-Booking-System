import { prisma } from './config/db';
import { holdSeats } from './services/bookingService';

async function runConcurrencyTest() {
  console.log('--- STARTING CONCURRENCY PROTECTION TEST ---');

  // 1. Find the summer event and its seats
  const event = await prisma.event.findFirst({
    where: { title: 'Summer Symphony & Jazz Night' },
    include: {
      venue: {
        include: { seats: true },
      },
    },
  });

  if (!event || event.venue.seats.length === 0) {
    console.error('Error: Could not find event or seats. Run seeding first.');
    process.exit(1);
  }

  // Select the very first seat: Row 1, Col 1
  const testSeat = event.venue.seats[0];
  console.log(`Testing concurrent holds on Seat: Row ${testSeat.row}, Col ${testSeat.number} (ID: ${testSeat.id})`);

  // 2. Ensure seat is AVAILABLE initially
  await prisma.seatStatus.update({
    where: {
      eventId_seatId: { eventId: event.id, seatId: testSeat.id },
    },
    data: {
      status: 'AVAILABLE',
      heldByUserId: null,
      heldAt: null,
      expiresAt: null,
    },
  });
  console.log('Seat status reset to AVAILABLE.');

  // 3. Create 5 mock users for the concurrent hold attempts
  console.log('Creating 5 temporary test users...');
  const userPromises = Array.from({ length: 5 }).map((_, i) => 
    prisma.user.upsert({
      where: { email: `testuser_${i}@concurrency.com` },
      update: {},
      create: {
        email: `testuser_${i}@concurrency.com`,
        passwordHash: 'nopassword',
        role: 'CUSTOMER',
        name: `Concurrent User ${i}`,
      },
    })
  );
  const testUsers = await Promise.all(userPromises);

  // 4. Concurrently attempt to hold the same seat for all 5 users
  console.log(`Triggering 5 concurrent seat hold requests for user IDs: ${testUsers.map(u => u.name).join(', ')}...`);
  
  const holdAttempts = testUsers.map(async (user) => {
    try {
      await holdSeats(user.id, event.id, [testSeat.id], 5);
      return { user: user.name, success: true, error: null };
    } catch (err: any) {
      return { user: user.name, success: false, error: err.message };
    }
  });

  const results = await Promise.all(holdAttempts);

  // 5. Analyze Results
  console.log('\n--- ATTEMPT RESULTS ---');
  results.forEach(res => {
    if (res.success) {
      console.log(`✅ ${res.user}: SUCCESS! Seat held.`);
    } else {
      console.log(`❌ ${res.user}: FAILED. Reason: "${res.error}"`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  console.log('\n--- SUMMARY ---');
  console.log(`Successful Holds: ${successCount}`);
  console.log(`Failed Holds (Blocked): ${failureCount}`);

  if (successCount === 1) {
    console.log('\n⭐ TEST PASSED! Concurrency protection works perfectly. Exactly ONE concurrent request succeeded.');
  } else {
    console.error('\n💥 TEST FAILED! Concurrency leak occurred. Multiple holds succeeded.');
  }

  // Cleanup: Delete temporary users and release the hold
  console.log('\nCleaning up test resources...');
  await prisma.seatStatus.update({
    where: {
      eventId_seatId: { eventId: event.id, seatId: testSeat.id },
    },
    data: {
      status: 'AVAILABLE',
      heldByUserId: null,
      heldAt: null,
      expiresAt: null,
    },
  });
  
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: 'testuser_',
        endsWith: '@concurrency.com',
      },
    },
  });

  console.log('Cleanup complete.');
}

runConcurrencyTest()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
