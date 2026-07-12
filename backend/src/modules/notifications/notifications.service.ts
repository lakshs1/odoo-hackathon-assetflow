import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { notifications } from '../../db/schema/notifications';
import { requireEmployeeByUserId } from '../../lib/employee';
import { AppError } from '../../lib/errors';

export async function getMyNotifications(userId: string) {
  const employee = await requireEmployeeByUserId(userId);
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientEmployeeId, employee.id))
    .orderBy(desc(notifications.createdAt));
}

export async function markAsRead(notificationId: string, userId: string) {
  const employee = await requireEmployeeByUserId(userId);
  const [notification] = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientEmployeeId, employee.id)
      )
    );

  if (!notification) {
    throw new AppError(404, 'Notification not found');
  }

  const [updatedNotification] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, notificationId))
    .returning();

  return updatedNotification;
}
