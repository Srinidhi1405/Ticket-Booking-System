import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Users
  const passwordHash = bcrypt.hashSync('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ticketify.com' },
    update: {},
    create: {
      email: 'admin@ticketify.com',
      passwordHash,
      role: 'ADMIN',
      name: 'System Admin',
    },
  });

  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@ticketify.com' },
    update: {},
    create: {
      email: 'organizer@ticketify.com',
      passwordHash,
      role: 'ORGANIZER',
      name: 'Music Events Corp',
    },
  });

  const customer1 = await prisma.user.upsert({
    where: { email: 'customer1@gmail.com' },
    update: {},
    create: {
      email: 'customer1@gmail.com',
      passwordHash,
      role: 'CUSTOMER',
      name: 'Alice Johnson',
    },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: 'customer2@gmail.com' },
    update: {},
    create: {
      email: 'customer2@gmail.com',
      passwordHash,
      role: 'CUSTOMER',
      name: 'Bob Smith',
    },
  });

  console.log('Users seeded:', {
    admin: admin.email,
    organizer: organizer.email,
    customer1: customer1.email,
    customer2: customer2.email,
  });

  // Create Venue
  // Let's create a venue "Metropolis Symphony Hall" with 6 rows and 8 columns (48 seats total)
  const venue = await prisma.venue.create({
    data: {
      name: 'Metropolis Symphony Hall',
      address: '456 Concert Way, Metropolis',
      rows: 6,
      cols: 8,
    },
  });

  console.log('Venue created:', venue.name);

  // Generate seats for the venue
  // Rows 1-2: Premium, Rows 3-6: Standard
  const seatsData = [];
  for (let r = 1; r <= venue.rows; r++) {
    for (let c = 1; c <= venue.cols; c++) {
      seatsData.push({
        venueId: venue.id,
        row: r,
        number: c,
        category: r <= 2 ? 'Premium' : 'Standard',
      });
    }
  }

  // SQLite prisma doesn't always support createMany depending on configuration, so we create in loop or promise all
  const seats = await Promise.all(
    seatsData.map((seat) =>
      prisma.seat.create({
        data: seat,
      })
    )
  );
  console.log(`${seats.length} seats created for venue.`);

  // Create an Event (Date: 10 days in the future)
  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + 10);
  eventDate.setHours(19, 30, 0, 0);

  const event = await prisma.event.create({
    data: {
      title: 'Summer Symphony & Jazz Night',
      description: 'An evening of classical orchestral masterworks and smooth jazz highlights, featuring world-class soloists.',
      imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&auto=format&fit=crop&q=60',
      date: eventDate,
      time: '19:30',
      venueId: venue.id,
      organizerId: organizer.id,
    },
  });

  console.log('Event created:', event.title);

  // Define seat category pricing
  await prisma.seatCategoryPricing.create({
    data: { eventId: event.id, category: 'Premium', price: 120.0 },
  });
  await prisma.seatCategoryPricing.create({
    data: { eventId: event.id, category: 'Standard', price: 60.0 },
  });
  console.log('Pricing categories set.');

  // Initialize SeatStatus for this event (all seats set to AVAILABLE)
  await Promise.all(
    seats.map((seat) =>
      prisma.seatStatus.create({
        data: {
          eventId: event.id,
          seatId: seat.id,
          status: 'AVAILABLE',
        },
      })
    )
  );
  console.log('Initial seat statuses initialized.');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
