import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDb() {
    const { data: repos, error: pErr } = await supabase.from('repositories').select('*');
    console.log("Repositories:", repos, pErr);
}
checkDb();
