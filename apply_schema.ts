import { Client } from 'pg';
import fs from 'fs';

async function applySchema() {
    // Exact user string mapped to Port 5432 on the pooler 
    const connectionString = "postgresql://postgres.wmwwrcsexophskplultx:Geethika%402006@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000
    });

    try {
        console.log("Connecting to Supabase Database via Pooler 5432...");
        await client.connect();
        console.log("Connected! Applying SQL Schema...");

        const sql = fs.readFileSync('supabase_schema.sql', 'utf8');
        await client.query(sql);
        console.log("✅ Schema applied successfully! All tables created.");
    } catch (e) {
        console.error("❌ Error applying schema:", e);
    } finally {
        await client.end();
    }
}

applySchema();
