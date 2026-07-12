import { db } from '../../db';
import { employees } from '../../db/schema/employees';
import { departments } from '../../db/schema/departments';
import { eq } from 'drizzle-orm';
import { AppError } from '../../lib/errors';

export async function list() {
  return db
    .select({
      id: employees.id,
      userId: employees.userId,
      departmentId: employees.departmentId,
      departmentName: departments.name,
      fullName: employees.fullName,
      employeeCode: employees.employeeCode,
      createdAt: employees.createdAt,
      updatedAt: employees.updatedAt,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id));
}

export async function create(data: {
  userId: string;
  departmentId: string;
  fullName: string;
  employeeCode: string;
}) {
  if (!data.userId || !data.departmentId || !data.fullName || !data.employeeCode) {
    throw new AppError(400, 'Bad Request: missing required employee fields');
  }

  const [newEmployee] = await db
    .insert(employees)
    .values({
      userId: data.userId,
      departmentId: data.departmentId,
      fullName: data.fullName,
      employeeCode: data.employeeCode,
    })
    .returning();
  
  return newEmployee;
}

export async function update(
  id: string,
  data: {
    departmentId?: string;
    fullName?: string;
    employeeCode?: string;
  }
) {
  const updateData: any = {};
  if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
  if (data.fullName !== undefined) updateData.fullName = data.fullName;
  if (data.employeeCode !== undefined) updateData.employeeCode = data.employeeCode;

  // Explicitly update updatedAt on every update call
  updateData.updatedAt = new Date();

  const [updatedEmployee] = await db
    .update(employees)
    .set(updateData)
    .where(eq(employees.id, id))
    .returning();

  if (!updatedEmployee) {
    throw new AppError(404, 'Employee not found');
  }
  return updatedEmployee;
}
