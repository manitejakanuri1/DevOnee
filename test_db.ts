import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDb() {
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
    console.log("Profiles:", profiles, pErr);

    if (profiles && profiles.length > 0) {
        console.log("First profile ID:", profiles[0].id);
    }
}
checkDb();
