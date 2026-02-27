import { NextRequest, NextResponse } from "next/server";
import { fetchFileContent } from "@/lib/github";
import { safePath } from "@/lib/path-utils";

export async function POST(req: NextRequest) {
    try {
        const { owner, repo, path: rawPath, ref } = await req.json();

        if (!owner || !repo || !rawPath) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const cleanedPath = safePath(rawPath);
        const branch = ref || "main";
        const content = await fetchFileContent(owner, repo, cleanedPath, branch);

        return NextResponse.json({ success: true, content, metadata: { path: cleanedPath, branch } });
    } catch (error: any) {
        console.error("GitHub Content API Error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: error.message }, { status: 500 });
    }
}
