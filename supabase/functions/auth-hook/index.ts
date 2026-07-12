import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import postgres from "https://deno.land/x/postgresjs@v3.3.4/mod.js";

const dbUrl = Deno.env.get("SUPABASE_DB_URL") || Deno.env.get("DATABASE_URL") || "";
const sql = postgres(dbUrl);

serve(async (req) => {
  try {
    const { event, user } = await req.json();

    let role = 'employee';
    if (user?.id) {
      const result = await sql`
        SELECT role FROM public.user_roles WHERE user_id = ${user.id} LIMIT 1
      `;
      if (result.length > 0) {
        role = result[0].role;
      }
    }

    return new Response(
      JSON.stringify({
        claims: {
          app_metadata: {
            role: role
          }
        }
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
