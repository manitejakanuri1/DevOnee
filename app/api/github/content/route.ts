import { NextRequest, NextResponse } from "next/server";
import { fetchFileContent } from "@/lib/github";

export async function POST(req: NextRequest) {
    try {
        const { owner, repo, path, ref } = await req.json();

        if (!owner || !repo || !path) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const branch = ref || "main";
        const content = await fetchFileContent(owner, repo, path, branch);

        return NextResponse.json({ success: true, content, metadata: { path, branch } });
    } catch (error: any) {
        console.error("GitHub Content API Error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: error.message }, { status: 500 });
    }
}
