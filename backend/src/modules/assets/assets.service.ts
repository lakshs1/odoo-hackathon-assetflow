import { db } from '../../db';
import { assets, assetCategories } from '../../db/schema/assets';
import { eq } from 'drizzle-orm';
import { AppError } from '../../lib/errors';

export const VALID_TRANSITIONS: Record<string, string[]> = {
  available: ['allocated', 'reserved', 'under_maintenance'],
  allocated: ['available', 'under_maintenance', 'lost'],
  reserved: ['available', 'allocated'],
  under_maintenance: ['available', 'retired'],
  lost: ['available', 'disposed'],
  retired: ['disposed'],
  disposed: [],
};

export async function listCategories() {
  return db.select().from(assetCategories);
}

export async function createCategory(data: { name: string; description?: string }) {
  if (!data.name) {
    throw new AppError(400, 'Bad Request: name is required');
  }
  const [newCategory] = await db
    .insert(assetCategories)
    .values({
      name: data.name,
      description: data.description,
    })
    .returning();
  return newCategory;
}

export async function listAssets() {
  return db
    .select({
      id: assets.id,
      categoryId: assets.categoryId,
      categoryName: assetCategories.name,
      name: assets.name,
      serialNumber: assets.serialNumber,
      state: assets.state,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
    })
    .from(assets)
    .leftJoin(assetCategories, eq(assets.categoryId, assetCategories.id));
}

export async function createAsset(data: { name: string; categoryId: string; serialNumber: string }) {
  if (!data.name || !data.categoryId || !data.serialNumber) {
    throw new AppError(400, 'Bad Request: missing required asset fields');
  }

  const [newAsset] = await db
    .insert(assets)
    .values({
      name: data.name,
      categoryId: data.categoryId,
      serialNumber: data.serialNumber,
    })
    .returning();
  return newAsset;
}

export async function transitionState(id: string, newState: string, role?: string) {
  // 1. Get the current asset state
  const [asset] = await db
    .select()
    .from(assets)
    .where(eq(assets.id, id));

  if (!asset) {
    throw new AppError(404, 'Asset not found');
  }

  if (asset.state === newState) {
    return asset;
  }

  // 2. Validate against application-level transitions
  const allowed = VALID_TRANSITIONS[asset.state] || [];
  if (!allowed.includes(newState)) {
    throw new AppError(422, `Invalid transition from ${asset.state} to ${newState}`);
  }

  // 3. Update the state in database
  try {
    const [updatedAsset] = await db
      .update(assets)
      .set({
        state: newState as any,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, id))
      .returning();
    return updatedAsset;
  } catch (err: any) {
    // Catch database trigger '22000' and rethrow as AppError(422)
    if (err.code === '22000') {
      throw new AppError(422, err.message || 'Invalid state transition');
    }
    throw err;
  }
}
