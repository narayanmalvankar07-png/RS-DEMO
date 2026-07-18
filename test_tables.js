import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { transport: ws }
});

async function listTables() {
  // Querying standard Postgrest schema endpoint
  const r = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });
  if (r.ok) {
    const swagger = await r.json();
    console.log("Available paths/tables:", Object.keys(swagger.paths));
  } else {
    console.error("Failed to fetch Swagger spec:", r.status, await r.text());
  }
}

listTables();
