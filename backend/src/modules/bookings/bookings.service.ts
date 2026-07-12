import { and, asc, desc, eq, gt, lt, or } from 'drizzle-orm';
import { db } from '../../db';
import { assets } from '../../db/schema/assets';
import { bookings } from '../../db/schema/bookings';
import { requireEmployeeByUserId } from '../../lib/employee';
import { AppError, ConflictError } from '../../lib/errors';

type CreateBookingInput = {
  assetId: string;
  startTime: string | Date;
  endTime: string | Date;
};

const VIEW_ALL_ROLES = new Set(['admin', 'manager', 'auditor', 'super_admin']);
const CANCEL_ELEVATED_ROLES = new Set(['admin', 'super_admin']);

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

export async function listBookings(userId: string, role: string) {
  const baseQuery = db
    .select()
    .from(bookings)
    .orderBy(desc(bookings.startTime));

  if (VIEW_ALL_ROLES.has(role)) {
    return baseQuery;
  }

  const employee = await requireEmployeeByUserId(userId);
  return baseQuery.where(eq(bookings.bookedByEmployeeId, employee.id));
}

export async function getNextAvailableSlots(
  assetId: string,
  start: string | Date,
  end: string | Date
) {
  const startDate = toDate(start);
  const endDate = toDate(end);
  const durationMs = endDate.getTime() - startDate.getTime();

  const confirmedBookings = await db
    .select({
      startTime: bookings.startTime,
      endTime: bookings.endTime,
    })
    .from(bookings)
    .where(and(eq(bookings.assetId, assetId), eq(bookings.status, 'confirmed')))
    .orderBy(asc(bookings.startTime));

  const slots: Array<{ startTime: Date; endTime: Date }> = [];
  let cursor = new Date(startDate);

  for (const booking of confirmedBookings) {
    const bookingStart = new Date(booking.startTime);
    const bookingEnd = new Date(booking.endTime);
    const candidateEnd = new Date(cursor.getTime() + durationMs);

    if (candidateEnd <= bookingStart) {
      slots.push({ startTime: new Date(cursor), endTime: candidateEnd });
      if (slots.length === 3) {
        return slots;
      }
      cursor = new Date(bookingEnd);
      continue;
    }

    if (cursor < bookingEnd) {
      cursor = new Date(bookingEnd);
    }
  }

  while (slots.length < 3) {
    const candidateStart = new Date(cursor);
    const candidateEnd = new Date(cursor.getTime() + durationMs);
    slots.push({ startTime: candidateStart, endTime: candidateEnd });
    cursor = candidateEnd;
  }

  return slots;
}

export async function createBooking(data: CreateBookingInput, userId: string) {
  const employee = await requireEmployeeByUserId(userId);
  const startTime = toDate(data.startTime);
  const endTime = toDate(data.endTime);

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new AppError(400, 'Invalid booking date range');
  }
  if (endTime <= startTime) {
    throw new AppError(400, 'endTime must be after startTime');
  }

  const [asset] = await db.select().from(assets).where(eq(assets.id, data.assetId));
  if (!asset) {
    throw new AppError(404, 'Asset not found');
  }
  if (asset.state !== 'available') {
    throw new AppError(409, 'Asset is not available for booking');
  }

  const overlaps = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.assetId, data.assetId),
        eq(bookings.status, 'confirmed'),
        lt(bookings.startTime, endTime),
        gt(bookings.endTime, startTime)
      )
    );

  if (overlaps.length > 0) {
    const nextAvailable = await getNextAvailableSlots(data.assetId, startTime, endTime);
    throw new ConflictError('Booking conflict', nextAvailable);
  }

  return db.transaction(async (tx) => {
    const [booking] = await tx
      .insert(bookings)
      .values({
        assetId: data.assetId,
        bookedByEmployeeId: employee.id,
        startTime,
        endTime,
      })
      .returning();

    await tx
      .update(assets)
      .set({
        state: 'reserved',
        updatedAt: new Date(),
      })
      .where(eq(assets.id, data.assetId));

    return booking;
  });
}

export async function cancelBooking(bookingId: string, userId: string, role: string) {
  const employee = CANCEL_ELEVATED_ROLES.has(role) ? null : await requireEmployeeByUserId(userId);
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));

  if (!booking) {
    throw new AppError(404, 'Booking not found');
  }
  if (booking.status !== 'confirmed') {
    throw new AppError(409, 'Only confirmed bookings can be cancelled');
  }
  if (!CANCEL_ELEVATED_ROLES.has(role) && booking.bookedByEmployeeId !== employee?.id) {
    throw new AppError(403, 'You can only cancel your own bookings');
  }
  if (new Date(booking.startTime) <= new Date()) {
    throw new AppError(409, 'Booking can only be cancelled before start time');
  }

  return db.transaction(async (tx) => {
    const [updatedBooking] = await tx
      .update(bookings)
      .set({ status: 'cancelled' })
      .where(eq(bookings.id, bookingId))
      .returning();

    await tx
      .update(assets)
      .set({
        state: 'available',
        updatedAt: new Date(),
      })
      .where(eq(assets.id, booking.assetId));

    return updatedBooking;
  });
}
