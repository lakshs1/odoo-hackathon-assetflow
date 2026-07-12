import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { allocations } from '../../db/schema/allocations';
import { assets } from '../../db/schema/assets';
import { maintenanceRequests } from '../../db/schema/maintenance';
import { notifications } from '../../db/schema/notifications';
import { requireEmployeeByUserId } from '../../lib/employee';
import { AppError } from '../../lib/errors';

type CreateMaintenanceInput = {
  assetId: string;
  notes?: string;
};

const VIEW_ALL_ROLES = new Set(['admin', 'manager', 'auditor', 'super_admin']);
const APPROVAL_ROLES = new Set(['manager', 'admin', 'super_admin']);

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  requested: ['approved', 'rejected'],
  approved: ['in_progress'],
  in_progress: ['completed'],
  completed: [],
  rejected: [],
};

export async function listMaintenanceRequests(userId: string, role: string) {
  const baseQuery = db.select().from(maintenanceRequests).orderBy(desc(maintenanceRequests.createdAt));

  if (VIEW_ALL_ROLES.has(role)) {
    return baseQuery;
  }

  const employee = await requireEmployeeByUserId(userId);
  return baseQuery.where(eq(maintenanceRequests.requestedBy, employee.id));
}

export async function createMaintenanceRequest(data: CreateMaintenanceInput, userId: string) {
  const requester = await requireEmployeeByUserId(userId);

  return db.transaction(async (tx) => {
    const [asset] = await tx.select().from(assets).where(eq(assets.id, data.assetId));
    if (!asset) {
      throw new AppError(404, 'Asset not found');
    }
    if (!['available', 'allocated'].includes(asset.state)) {
      throw new AppError(409, `Asset cannot enter maintenance from ${asset.state}`);
    }

    const [request] = await tx
      .insert(maintenanceRequests)
      .values({
        assetId: data.assetId,
        requestedBy: requester.id,
        notes: data.notes,
      })
      .returning();

    const [activeAllocation] = await tx
      .select()
      .from(allocations)
      .where(and(eq(allocations.assetId, data.assetId), eq(allocations.status, 'active')));

    if (activeAllocation) {
      await tx
        .update(allocations)
        .set({
          status: 'returned',
          returnedAt: new Date(),
        })
        .where(eq(allocations.id, activeAllocation.id));
    }

    await tx
      .update(assets)
      .set({
        state: 'under_maintenance',
        updatedAt: new Date(),
      })
      .where(eq(assets.id, data.assetId));

    return request;
  });
}

export async function transitionMaintenanceRequest(
  requestId: string,
  newState: string,
  actorRole: string,
  actorUserId: string
) {
  const [request] = await db
    .select()
    .from(maintenanceRequests)
    .where(eq(maintenanceRequests.id, requestId));

  if (!request) {
    throw new AppError(404, 'Maintenance request not found');
  }

  const allowed = ALLOWED_TRANSITIONS[request.state] ?? [];
  if (!allowed.includes(newState)) {
    throw new AppError(422, `Invalid transition from ${request.state} to ${newState}`);
  }
  if (newState === 'approved' && !APPROVAL_ROLES.has(actorRole)) {
    throw new AppError(403, 'Only manager, admin, or super_admin can approve maintenance');
  }

  const actorEmployee = await requireEmployeeByUserId(actorUserId);

  return db.transaction(async (tx) => {
    const updatePayload: {
      state: 'approved' | 'in_progress' | 'completed' | 'rejected';
      updatedAt: Date;
      approvedBy?: string;
    } = {
      state: newState as 'approved' | 'in_progress' | 'completed' | 'rejected',
      updatedAt: new Date(),
    };

    if (newState === 'approved') {
      updatePayload.approvedBy = actorEmployee.id;
    }

    const [updatedRequest] = await tx
      .update(maintenanceRequests)
      .set(updatePayload)
      .where(eq(maintenanceRequests.id, requestId))
      .returning();

    if (newState === 'completed' || newState === 'rejected') {
      await tx
        .update(assets)
        .set({
          state: 'available',
          updatedAt: new Date(),
        })
        .where(eq(assets.id, request.assetId));
    }

    await tx.insert(notifications).values({
      recipientEmployeeId: request.requestedBy,
      type: 'maintenance_update',
      referenceId: request.id,
      referenceTable: 'maintenance_requests',
      message: `Maintenance request moved to ${newState}`,
    });

    return updatedRequest;
  });
}
