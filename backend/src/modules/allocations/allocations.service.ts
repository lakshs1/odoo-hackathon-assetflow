import { and, desc, eq, isNull, or } from 'drizzle-orm';
import { db } from '../../db';
import { allocations } from '../../db/schema/allocations';
import { assets } from '../../db/schema/assets';
import { departments } from '../../db/schema/departments';
import { employees } from '../../db/schema/employees';
import { requireEmployeeByUserId } from '../../lib/employee';
import { AppError } from '../../lib/errors';

type CreateAllocationInput = {
  assetId: string;
  allocatedToEmployeeId?: string;
  allocatedToDepartmentId?: string;
};

const ELEVATED_ROLES = new Set(['admin', 'manager', 'super_admin']);

export async function createAllocation(data: CreateAllocationInput, actorUserId: string) {
  const actorEmployee = await requireEmployeeByUserId(actorUserId);

  const hasEmployeeTarget = Boolean(data.allocatedToEmployeeId);
  const hasDepartmentTarget = Boolean(data.allocatedToDepartmentId);
  if (hasEmployeeTarget === hasDepartmentTarget) {
    throw new AppError(400, 'Exactly one allocation target is required');
  }

  return db.transaction(async (tx) => {
    const [existingAsset] = await tx.select().from(assets).where(eq(assets.id, data.assetId));
    if (!existingAsset) {
      throw new AppError(404, 'Asset not found');
    }

    const [updatedAsset] = await tx
      .update(assets)
      .set({ state: 'allocated', updatedAt: new Date() })
      .where(and(eq(assets.id, data.assetId), eq(assets.state, 'available')))
      .returning();

    if (!updatedAsset) {
      throw new AppError(409, 'Asset is not available for allocation');
    }

    const [allocation] = await tx
      .insert(allocations)
      .values({
        assetId: data.assetId,
        allocatedToEmployeeId: data.allocatedToEmployeeId,
        allocatedToDepartmentId: data.allocatedToDepartmentId,
        allocatedBy: actorEmployee.id,
      })
      .returning();

    return allocation;
  });
}

export async function returnAllocation(allocationId: string) {
  return db.transaction(async (tx) => {
    const [allocation] = await tx
      .select()
      .from(allocations)
      .where(and(eq(allocations.id, allocationId), eq(allocations.status, 'active')));

    if (!allocation) {
      throw new AppError(404, 'Active allocation not found');
    }

    const [returnedAllocation] = await tx
      .update(allocations)
      .set({
        returnedAt: new Date(),
        status: 'returned',
      })
      .where(eq(allocations.id, allocationId))
      .returning();

    await tx
      .update(assets)
      .set({
        state: 'available',
        updatedAt: new Date(),
      })
      .where(eq(assets.id, allocation.assetId));

    return returnedAllocation;
  });
}

export async function listAllocations(userId: string, role: string) {
  const baseQuery = db
    .select({
      id: allocations.id,
      assetId: allocations.assetId,
      assetName: assets.name,
      status: allocations.status,
      allocatedAt: allocations.allocatedAt,
      returnedAt: allocations.returnedAt,
      allocatedToEmployeeId: allocations.allocatedToEmployeeId,
      allocatedToEmployeeName: employees.fullName,
      allocatedToDepartmentId: allocations.allocatedToDepartmentId,
      allocatedToDepartmentName: departments.name,
      allocatedBy: allocations.allocatedBy,
    })
    .from(allocations)
    .leftJoin(assets, eq(allocations.assetId, assets.id))
    .leftJoin(employees, eq(allocations.allocatedToEmployeeId, employees.id))
    .leftJoin(departments, eq(allocations.allocatedToDepartmentId, departments.id))
    .orderBy(desc(allocations.allocatedAt));

  if (ELEVATED_ROLES.has(role)) {
    return baseQuery;
  }

  const employee = await requireEmployeeByUserId(userId);
  return baseQuery.where(
    or(
      eq(allocations.allocatedToEmployeeId, employee.id),
      and(eq(allocations.allocatedBy, employee.id), isNull(allocations.allocatedToEmployeeId))
    )
  );
}
