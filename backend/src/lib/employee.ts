import { eq } from 'drizzle-orm';
import { db } from '../db';
import { employees } from '../db/schema/employees';
import { AppError } from './errors';

export async function getEmployeeByUserId(userId: string) {
  const [employee] = await db.select().from(employees).where(eq(employees.userId, userId));
  return employee ?? null;
}

export async function requireEmployeeByUserId(userId: string) {
  const employee = await getEmployeeByUserId(userId);
  if (!employee) {
    throw new AppError(404, 'Employee profile not found for user');
  }
  return employee;
}
