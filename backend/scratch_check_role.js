const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    const userId = 'a1b9143d-310b-49d0-8879-7654a68f786c';
    
    const roleRecord = await sql`SELECT * FROM public.user_roles WHERE user_id = ${userId}`;
    const employeeRecord = await sql`SELECT * FROM public.employees WHERE user_id = ${userId}`;
    
    console.log("User Role Record:", roleRecord);
    console.log("Employee Record:", employeeRecord);
  } catch (err) {
    console.error("Failed to query user roles:", err);
  } finally {
    await sql.end();
  }
}

run();
