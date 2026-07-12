import { db } from '../../db';
import { userRoles } from '../../db/schema/auth';
import { supabaseAdmin } from '../../lib/supabase';
import { AppError } from '../../lib/errors';

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'auditor' | 'employee';

export const CAN_ASSIGN: Record<UserRole, UserRole[]> = {
  super_admin: ['admin', 'manager', 'auditor', 'employee'],
  admin:       ['admin', 'manager', 'auditor', 'employee'],
  manager:     [],
  auditor:     [],
  employee:    [],
};

export async function assignRole(
  requesterId: string,
  requesterRole: UserRole,
  targetUserId: string,
  targetRole: UserRole
) {
  // Check permission matrix
  const allowedRoles = CAN_ASSIGN[requesterRole];
  if (!allowedRoles || !allowedRoles.includes(targetRole)) {
    throw new AppError(403, 'Forbidden: Unauthorized role assignment');
  }

  // Update Drizzle database (Upsert role mapping)
  await db.insert(userRoles)
    .values({
      userId: targetUserId,
      role: targetRole,
      assignedBy: requesterId,
    })
    .onConflictDoUpdate({
      target: userRoles.userId,
      set: {
        role: targetRole,
        assignedBy: requesterId,
      },
    });

  // Sync role to Supabase Auth metadata
  const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
    app_metadata: { role: targetRole },
  });

  if (error) {
    throw new AppError(500, `Failed to update auth metadata: ${error.message}`);
  }
}
