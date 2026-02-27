import { NextRequest, NextResponse } from "next/server";
import { getUserIdentity } from "@/lib/auth-guard";
import { checkAndIncrementUsage } from "@/lib/usage";
import { createAdminClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchFileContent } from "@/lib/github";

export async function POST(req: NextRequest) {
    try {
        const identity = await getUserIdentity();
        const usage = await checkAndIncrementUsage(identity.userId, identity.isGuest, "autofix_generate");
        if (!usage.allowed) {
            return NextResponse.json({ error: "LIMIT_EXCEEDED", message: usage.message }, { status: 429 });
        }

        const { issueId, owner, repo, filePath, description } = await req.json();

        const supabase: any = createAdminClient();
        let issue: any = null;
        let targetFilePath: string = "";
        let repoOwner = owner;
        let repoName = repo;

        if (issueId) {
            // Lookup from DB
            const { data } = await supabase
                .from("detected_issues")
                .select("*, repositories!inner(name)")
                .eq("id", issueId)
                .single();

            if (!data) {
                return NextResponse.json({ error: "Issue not found" }, { status: 404 });
            }
            issue = data;
            targetFilePath = data.file_path;
            const parts = ((data as any).repositories.name as string).split("/");
            repoOwner = parts[0];
            repoName = parts[1];
        } else {
            if (!owner || !repo || !filePath || !description) {
                return NextResponse.json({ error: "Missing required params" }, { status: 400 });
            }
            targetFilePath = filePath;
            issue = { description, file_path: filePath };
        }

        // Get default branch
        const metaRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
            headers: {
                Accept: "application/vnd.github.v3+json",
                ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
            },
        });
        const meta = await metaRes.json();
        const branch = meta.default_branch || "main";

        const fileContent = await fetchFileContent(repoOwner, repoName, targetFilePath, branch);
        if (!fileContent) {
            return NextResponse.json({ error: "Could not fetch file content" }, { status: 404 });
        }

        // Generate fix with Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction:
                "You are an expert software engineer. Return ONLY the complete corrected file content. No explanations, no markdown fences, no comments about changes. Just the raw corrected code.",
        });

        const prompt = `Fix the following issue in this file.

Issue: ${issue.description}
${issue.line_start ? `Location: lines ${issue.line_start}${issue.line_end ? `-${issue.line_end}` : ""}` : ""}

File: ${targetFilePath}

Current content:
${(fileContent as string).substring(0, 30000)}

Return ONLY the complete corrected file. Preserve all existing formatting and code that is not related to the fix.`;

        const result = await model.generateContent(prompt);
        let fixedContent = result.response.text() || "";

        // Strip markdown fences
        fixedContent = fixedContent
            .replace(/^```[a-z]*\n/, "")
            .replace(/\n```$/, "")
            .trim();

        // Update issue in DB
        if (issueId) {
            await supabase
                .from("detected_issues")
                .update({
                    suggested_fix: fixedContent,
                    status: "fixed",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", issueId);
        }

        return NextResponse.json({
            success: true,
            filePath: targetFilePath,
            originalContent: fileContent,
            fixedContent,
        });
    } catch (error: any) {
        console.error("AutoFix Generate API Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}
