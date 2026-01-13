import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "http://supabase:8000";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "service-role-key";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase configuration");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
