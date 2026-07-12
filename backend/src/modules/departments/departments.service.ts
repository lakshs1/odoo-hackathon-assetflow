import { db } from '../../db';
import { departments } from '../../db/schema/departments';
import { eq } from 'drizzle-orm';
import { AppError } from '../../lib/errors';

export async function list() {
  return db.select().from(departments);
}

export async function create(name: string) {
  if (!name) {
    throw new AppError(400, 'Department name is required');
  }
  const [newDept] = await db.insert(departments).values({ name }).returning();
  return newDept;
}

export async function update(id: string, name: string) {
  if (!name) {
    throw new AppError(400, 'Department name is required');
  }
  const [updatedDept] = await db
    .update(departments)
    .set({ name })
    .where(eq(departments.id, id))
    .returning();
  
  if (!updatedDept) {
    throw new AppError(404, 'Department not found');
  }
  return updatedDept;
}

export async function remove(id: string) {
  try {
    const [deletedDept] = await db
      .delete(departments)
      .where(eq(departments.id, id))
      .returning();

    if (!deletedDept) {
      throw new AppError(404, 'Department not found');
    }
    return deletedDept;
  } catch (err: any) {
    if (err.code === '23503') {
      throw new AppError(409, 'Cannot delete department with employees');
    }
    throw err;
  }
}
