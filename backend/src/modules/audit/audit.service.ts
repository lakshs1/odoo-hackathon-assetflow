import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import {
  auditAssignments,
  auditCycles,
  auditFindings,
  discrepancyReports,
} from '../../db/schema/audit';
import { requireEmployeeByUserId } from '../../lib/employee';
import { AppError } from '../../lib/errors';

type CreateCycleInput = {
  name: string;
  startDate: string;
  endDate: string;
  status?: 'planned' | 'active' | 'completed';
};

type CreateFindingInput = {
  auditCycleId: string;
  assetId: string;
  expectedState: 'available' | 'allocated' | 'reserved' | 'under_maintenance' | 'lost' | 'retired' | 'disposed';
  observedState: 'available' | 'allocated' | 'reserved' | 'under_maintenance' | 'lost' | 'retired' | 'disposed';
  notes?: string;
};

export async function createCycle(data: CreateCycleInput, userId: string) {
  const employee = await requireEmployeeByUserId(userId);
  const [cycle] = await db
    .insert(auditCycles)
    .values({
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status ?? 'planned',
      createdBy: employee.id,
    })
    .returning();
  return cycle;
}

export async function listCycles() {
  return db.select().from(auditCycles).orderBy(desc(auditCycles.createdAt));
}

export async function addAssignment(cycleId: string, auditorEmployeeId: string) {
  const [assignment] = await db
    .insert(auditAssignments)
    .values({
      auditCycleId: cycleId,
      auditorEmployeeId,
    })
    .returning();
  return assignment;
}

export async function createFinding(data: CreateFindingInput, actorUserId: string) {
  const employee = await requireEmployeeByUserId(actorUserId);
  const [cycle] = await db.select().from(auditCycles).where(eq(auditCycles.id, data.auditCycleId));

  if (!cycle) {
    throw new AppError(404, 'Audit cycle not found');
  }
  if (cycle.status !== 'active') {
    throw new AppError(403, 'Audit cycle is not active');
  }

  const [assignment] = await db
    .select()
    .from(auditAssignments)
    .where(
      and(
        eq(auditAssignments.auditCycleId, data.auditCycleId),
        eq(auditAssignments.auditorEmployeeId, employee.id)
      )
    );

  if (!assignment) {
    throw new AppError(403, 'You are not assigned to this audit cycle');
  }

  const [finding] = await db
    .insert(auditFindings)
    .values({
      auditCycleId: data.auditCycleId,
      assetId: data.assetId,
      expectedState: data.expectedState,
      observedState: data.observedState,
      discrepancyFlag: data.expectedState !== data.observedState,
      notes: data.notes,
      createdBy: employee.id,
    })
    .returning();

  return finding;
}

export async function listFindings(cycleId: string) {
  return db
    .select()
    .from(auditFindings)
    .where(eq(auditFindings.auditCycleId, cycleId));
}

export async function getDiscrepancyReport(cycleId: string) {
  const [report] = await db
    .select()
    .from(discrepancyReports)
    .where(eq(discrepancyReports.auditCycleId, cycleId))
    .orderBy(desc(discrepancyReports.generatedAt));

  if (!report) {
    throw new AppError(404, 'Discrepancy report not found');
  }

  return report;
}
