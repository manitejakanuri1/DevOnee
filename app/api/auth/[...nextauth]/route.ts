import { NextResponse } from "next/server";

// NextAuth removed — using Supabase Auth
export async function GET() {
    return NextResponse.json({ error: "Auth moved to Supabase" }, { status: 410 });
}

export async function POST() {
    return NextResponse.json({ error: "Auth moved to Supabase" }, { status: 410 });
}
