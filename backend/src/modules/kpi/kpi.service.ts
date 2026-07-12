import { and, desc, eq, gte, isNull, lt, lte, sql } from 'drizzle-orm';
import { db } from '../../db';
import { allocations } from '../../db/schema/allocations';
import { assets } from '../../db/schema/assets';
import { maintenanceRequests } from '../../db/schema/maintenance';

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function assetUtilization() {
  return db
    .select({
      state: assets.state,
      count: sql<number>`count(*)::int`,
    })
    .from(assets)
    .groupBy(assets.state);
}

export async function overdueAllocations() {
  const threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const list = await db
    .select()
    .from(allocations)
    .where(
      and(
        eq(allocations.status, 'active'),
        isNull(allocations.returnedAt),
        lt(allocations.allocatedAt, threshold)
      )
    )
    .orderBy(desc(allocations.allocatedAt));

  return {
    count: list.length,
    items: list,
  };
}

export async function maintenanceActivity(start?: string, end?: string) {
  const fallback = getCurrentMonthRange();
  const startDate = start ? new Date(start) : fallback.start;
  const endDate = end ? new Date(end) : fallback.end;

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error('Invalid date range');
  }

  const counts = await db
    .select({
      state: maintenanceRequests.state,
      count: sql<number>`count(*)::int`,
    })
    .from(maintenanceRequests)
    .where(
      and(
        gte(maintenanceRequests.createdAt, startDate),
        lte(maintenanceRequests.createdAt, endDate)
      )
    )
    .groupBy(maintenanceRequests.state);

  return {
    startDate,
    endDate,
    counts,
  };
}
