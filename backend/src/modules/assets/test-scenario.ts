import 'dotenv/config';
import { db } from '../../db';
import { assets, assetCategories } from '../../db/schema/assets';
import * as assetsService from './assets.service';
import { eq, sql } from 'drizzle-orm';
import { AppError } from '../../lib/errors';

async function runScenarioTest() {
  console.log('--- Starting Scenario-based Integration Test for Assets Module ---');

  const testCategoryName = 'E2E Test Laptops';
  const testAssetSerialNumber = 'SN-E2E-TEST-0001';
  let createdCategoryId: string | null = null;
  let createdAssetId: string | null = null;

  // Cleanup helper
  const cleanup = async () => {
    try {
      if (createdAssetId) {
        await db.delete(assets).where(eq(assets.id, createdAssetId));
      } else {
        await db.delete(assets).where(eq(assets.serialNumber, testAssetSerialNumber));
      }
      if (createdCategoryId) {
        await db.delete(assetCategories).where(eq(assetCategories.id, createdCategoryId));
      } else {
        await db.delete(assetCategories).where(eq(assetCategories.name, testCategoryName));
      }
      console.log('- Test data cleaned up successfully.');
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
  };

  try {
    // 1. Initial cleanup
    console.log('1. Cleaning up any previous test data...');
    await cleanup();

    // 2. Create asset category
    console.log('\n2. Creating a test category...');
    const category = await assetsService.createCategory({
      name: testCategoryName,
      description: 'Temporary category for integration testing',
    });
    createdCategoryId = category.id;
    console.log(`- Category created: ${category.name} (ID: ${category.id})`);

    // 3. Create asset
    console.log('\n3. Creating a test asset with default state...');
    const asset = await assetsService.createAsset({
      name: 'E2E Macbook Pro',
      categoryId: createdCategoryId,
      serialNumber: testAssetSerialNumber,
    });
    createdAssetId = asset.id;
    console.log(`- Asset created: ${asset.name} (ID: ${asset.id})`);
    
    // Assert state is 'available'
    const isStateAvailable = asset.state === 'available';
    console.log(`- Default state is 'available': ${isStateAvailable ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!isStateAvailable) throw new Error('Default state is not available');

    // 4. Test state machine valid transitions
    // Transitions path: available -> reserved -> allocated -> under_maintenance -> available
    const transitions = ['reserved', 'allocated', 'under_maintenance', 'available'];
    for (const targetState of transitions) {
      console.log(`\n4. Transitioning asset state to: ${targetState}`);
      const updated = await assetsService.transitionState(createdAssetId, targetState);
      const success = updated.state === targetState;
      console.log(`- Transition result: ${success ? 'PASSED ✅' : 'FAILED ❌'} (Updated state: ${updated.state})`);
      if (!success) throw new Error(`Failed transition to ${targetState}`);
    }

    // 5. Test state machine invalid transitions
    // Transition path: available -> lost (not allowed)
    console.log('\n5. Testing invalid transition: available -> lost');
    try {
      await assetsService.transitionState(createdAssetId, 'lost');
      console.log('- Invalid transition: FAILED ❌ (expected it to throw 422)');
      throw new Error('Invalid transition succeeded unexpectedly');
    } catch (err: any) {
      const isExpected = err instanceof AppError && err.status === 422;
      console.log(`- Transition rejected with 422 error: ${isExpected ? 'PASSED ✅' : 'FAILED ❌'}`);
      console.log(`  Error Message: "${err.message}"`);
      if (!isExpected) throw err;
    }

    // 6. Test duplicate serial number constraint
    console.log('\n6. Testing duplicate serial number constraint...');
    try {
      await assetsService.createAsset({
        name: 'E2E Macbook Air Duplicate',
        categoryId: createdCategoryId,
        serialNumber: testAssetSerialNumber,
      });
      console.log('- Duplicate serial number check: FAILED ❌ (expected it to throw unique constraint violation)');
      throw new Error('Duplicate asset created unexpectedly');
    } catch (err: any) {
      // Drizzle/pg unique violation code is 23505 (can be in err.code or err.cause.code)
      const isUniqueViolation = err.code === '23505' || err.cause?.code === '23505';
      console.log(`- Duplicate serial check threw 23505 violation: ${isUniqueViolation ? 'PASSED ✅' : 'FAILED ❌'}`);
      if (!isUniqueViolation) throw err;
    }

  } catch (error) {
    console.error('\nScenario test failed with error:', error);
    process.exit(1);
  } finally {
    console.log('\n7. Running final cleanup...');
    await cleanup();
    console.log('--- Scenario-based Integration Test Finished ---');
    process.exit(0);
  }
}

runScenarioTest();
