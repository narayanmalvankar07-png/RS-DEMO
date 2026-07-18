import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { transport: ws }
});

async function checkProfiles() {
  const { data, error } = await supabase
    .from("rs_user_profiles")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error fetching rs_user_profiles:", error);
  } else {
    console.log("Success! Columns in rs_user_profiles:", data.length > 0 ? Object.keys(data[0]) : "No rows found");
  }
}

checkProfiles();
