import { NextRequest, NextResponse } from "next/server";
import { getUserIdentity } from "@/lib/auth-guard";
import { checkAndIncrementUsage } from "@/lib/usage";
import { createAdminClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchFileTree, fetchFileContent } from "@/lib/github";

const SCANNABLE_EXT = [".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".go", ".rs", ".rb", ".php"];
const SKIP_PATTERNS = ["node_modules", "dist", "build", ".next", "__pycache__", "vendor", ".min.", "package-lock", "yarn.lock"];

export async function POST(req: NextRequest) {
    try {
        const identity = await getUserIdentity();
        const usage = await checkAndIncrementUsage(identity.userId, identity.isGuest, "autofix_scan");
        if (!usage.allowed) {
            return NextResponse.json({ error: "LIMIT_EXCEEDED", message: usage.message }, { status: 429 });
        }

        const { owner, repo } = await req.json();
        if (!owner || !repo) {
            return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });
        }

        const supabase: any = createAdminClient();
        const repoFullName = `${owner}/${repo}`.toLowerCase();

        const { data: repository } = await supabase
            .from("repositories")
            .select("id")
            .eq("name", repoFullName)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!repository) {
            return NextResponse.json(
                { error: "Repository not indexed yet. Visit the Overview tab first." },
                { status: 404 }
            );
        }

        // Fetch file tree
        const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
                Accept: "application/vnd.github.v3+json",
                ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
            },
        });
        const meta = await metaRes.json();
        const branch = meta.default_branch || "main";

        const tree = await fetchFileTree(owner, repo, branch);
        const candidates = (tree.tree || [])
            .filter((f: any) => f.type === "blob")
            .filter((f: any) => SCANNABLE_EXT.some((ext) => f.path.endsWith(ext)))
            .filter((f: any) => !SKIP_PATTERNS.some((skip) => f.path.includes(skip)))
            .filter((f: any) => (f.size || 0) < 50000)
            .sort((a: any, b: any) => {
                const pri = (p: string) =>
                    p.startsWith("src/") || p.startsWith("lib/") || p.startsWith("app/") ? 0 : 1;
                return pri(a.path) - pri(b.path);
            })
            .slice(0, 10);

        // AI scan each file
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: "You are a senior code reviewer. Output valid JSON only. No markdown fences.",
        });

        const allIssues: any[] = [];

        for (const file of candidates) {
            try {
                const content = await fetchFileContent(owner, repo, file.path, branch);
                if (!content || typeof content !== "string" || content.length < 10) continue;

                const prompt = `Analyze this code file for real, actionable issues. Focus on bugs, security vulnerabilities, and performance problems. Ignore minor style issues.

File: ${file.path}
Repository: ${repoFullName}

Return a JSON array of issues. If no issues, return [].
Each issue:
{
  "issue_type": "bug" | "lint" | "security" | "performance",
  "severity": "low" | "medium" | "high" | "critical",
  "line_start": number or null,
  "line_end": number or null,
  "description": "Clear 1-2 sentence description"
}

Be practical — only flag issues worth fixing. Max 3 issues per file.

Code:
${(content as string).substring(0, 15000)}`;

                const result = await model.generateContent(prompt);
                let text = result.response.text() || "[]";
                // Strip markdown fences
                text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

                let issues: any[] = [];
                try {
                    const parsed = JSON.parse(text);
                    issues = Array.isArray(parsed) ? parsed : parsed.issues || [];
                } catch {
                    continue; // skip if JSON parse fails
                }

                for (const issue of issues.slice(0, 3)) {
                    if (!issue.issue_type || !issue.severity || !issue.description) continue;
                    allIssues.push({
                        repository_id: repository.id,
                        profile_id: identity.profileId || null,
                        issue_type: issue.issue_type,
                        severity: issue.severity,
                        file_path: file.path,
                        line_start: issue.line_start || null,
                        line_end: issue.line_end || null,
                        description: issue.description,
                        status: "open",
                    });
                }
            } catch (fileErr) {
                console.error(`[AutoFix Scan] Error scanning ${file.path}:`, fileErr);
            }
        }

        // Insert issues
        if (allIssues.length > 0) {
            const { error: insertErr } = await supabase.from("detected_issues").insert(allIssues);
            if (insertErr) console.error("Failed to insert issues:", insertErr);
        }

        // Return all issues for this repo
        const { data: storedIssues } = await supabase
            .from("detected_issues")
            .select("*")
            .eq("repository_id", repository.id)
            .neq("status", "ignored")
            .order("created_at", { ascending: false });

        return NextResponse.json({
            success: true,
            scannedFiles: candidates.length,
            newIssues: allIssues.length,
            issues: storedIssues || allIssues,
        });
    } catch (error: any) {
        console.error("AutoFix Scan API Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}
