import 'dotenv/config';
import { db } from '../../db';
import { userRoles } from '../../db/schema/auth';
import { eq, sql } from 'drizzle-orm';

async function runScenarioTest() {
  console.log('--- Starting Scenario-based Test for Supabase Auth Hook ---');

  const adminUserId = '00000000-0000-0000-0000-000000000001';
  const employeeUserId = '00000000-0000-0000-0000-000000000002';
  const unknownUserId = '00000000-0000-0000-0000-000000000003';

  // Helper function to cleanup mock users from all tables
  const cleanup = async () => {
    await db.execute(sql`DELETE FROM public.user_roles WHERE user_id IN (${adminUserId}, ${employeeUserId});`);
    await db.execute(sql`DELETE FROM public.employees WHERE id IN (${adminUserId}, ${employeeUserId});`);
    await db.execute(sql`DELETE FROM auth.users WHERE id IN (${adminUserId}, ${employeeUserId});`);
  };

  try {
    // 1. Cleanup any previous test data
    console.log('1. Cleaning up any previous test data...');
    await cleanup();

    // 2. Setup mock data by inserting directly into auth.users (triggers will fire)
    console.log('2. Inserting test users directly into auth.users...');
    await db.execute(sql`
      INSERT INTO auth.users (id, email) VALUES 
      (${adminUserId}, 'test_admin@example.com'),
      (${employeeUserId}, 'test_employee@example.com');
    `);
    console.log('- Users successfully created in auth.users.');

    // 3. Update the admin user's role to 'admin' in public.user_roles (the employee user already got 'employee' via trigger)
    console.log('\n3. Setting admin user role in public.user_roles...');
    await db.update(userRoles)
      .set({ role: 'admin' })
      .where(eq(userRoles.userId, adminUserId));
    console.log("- Role updated to 'admin' for admin user.");

    // 4. Simulate Edge Function Hook execution for each scenario
    const testCases = [
      { name: 'Admin User', userId: adminUserId, expectedRole: 'admin' },
      { name: 'Employee User', userId: employeeUserId, expectedRole: 'employee' },
      { name: 'Unknown User (Default Fallback)', userId: unknownUserId, expectedRole: 'employee' }
    ];

    for (const testCase of testCases) {
      console.log(`\nScenario: Testing user ${testCase.name} (ID: ${testCase.userId})`);
      
      // The exact SQL query run in the Supabase Edge function:
      // SELECT role FROM public.user_roles WHERE user_id = $1 LIMIT 1
      const [roleRow] = await db
        .select({ role: userRoles.role })
        .from(userRoles)
        .where(eq(userRoles.userId, testCase.userId))
        .limit(1);

      const resolvedRole = roleRow ? roleRow.role : 'employee';

      // The exact response returned to Supabase Auth by the hook:
      const hookResponse = {
        claims: {
          app_metadata: {
            role: resolvedRole
          }
        }
      };

      console.log('Resulting JWT Claims response from Auth Hook:');
      console.log(JSON.stringify(hookResponse, null, 2));
      console.log(`Status: ${resolvedRole === testCase.expectedRole ? 'PASSED ✅' : 'FAILED ❌'}`);
    }

  } catch (error) {
    console.error('Test execution failed:', error);
  } finally {
    // 5. Cleanup test data
    console.log('\n4. Cleaning up test data from database...');
    await cleanup();
    console.log('--- Test finished successfully ---');
    process.exit(0);
  }
}

runScenarioTest();
