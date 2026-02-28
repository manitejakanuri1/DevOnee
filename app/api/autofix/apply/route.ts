import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/server";
import {
    forkRepository,
    waitForFork,
    getDefaultBranch,
    getDefaultBranchSHA,
    createBranch,
    commitFile,
    createPullRequest,
} from "@/lib/github-write";

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (!auth) {
            return NextResponse.json(
                { error: "UNAUTHORIZED", message: "Please sign in with GitHub to create PRs." },
                { status: 401 }
            );
        }

        const token = auth.accessToken;
        if (!token) {
            return NextResponse.json(
                { error: "NO_TOKEN", message: "No GitHub access token. Please re-sign in." },
                { status: 401 }
            );
        }

        const { issueId } = await req.json();
        if (!issueId) {
            return NextResponse.json({ error: "Missing issueId" }, { status: 400 });
        }

        const supabase: any = createAdminClient();

        // Lookup issue + fix
        const { data: issue } = await supabase
            .from("detected_issues")
            .select("*, repositories!inner(name)")
            .eq("id", issueId)
            .single();

        if (!issue) {
            return NextResponse.json({ error: "Issue not found" }, { status: 404 });
        }

        if (!issue.suggested_fix) {
            return NextResponse.json(
                { error: "No fix generated yet. Generate a fix first." },
                { status: 400 }
            );
        }

        const [owner, repo] = ((issue as any).repositories.name as string).split("/");
        const shortId = issueId.substring(0, 8);
        const branchName = `autofix/issue-${shortId}`;
        const prTitle = `fix: ${issue.description.substring(0, 70)}`;
        const prBody = `## Automated Fix by DevOne Agent

**Issue Type:** \`${issue.issue_type}\`
**Severity:** \`${issue.severity}\`
**File:** \`${issue.file_path}\`
${issue.line_start ? `**Lines:** ${issue.line_start}${issue.line_end ? `-${issue.line_end}` : ""}` : ""}

### Description
${issue.description}

### What was changed
This PR applies an AI-generated fix to address the detected issue. Please review the changes carefully before merging.

---
*Created by [DevOne](https://devone.vercel.app) — AI Contribution Agent*`;

        // === 7-STEP PR PIPELINE ===

        // Step 1: Fork
        console.log(`[AutoFix] Step 1: Forking ${owner}/${repo}...`);
        const fork = await forkRepository(token, owner, repo);
        const forkOwner = fork.owner;

        // Step 2: Wait for fork
        console.log(`[AutoFix] Step 2: Waiting for fork...`);
        const forkReady = await waitForFork(token, forkOwner, repo);
        if (!forkReady) {
            return NextResponse.json({ error: "Fork creation timed out." }, { status: 504 });
        }

        // Step 3: Get default branch + SHA
        console.log(`[AutoFix] Step 3: Getting default branch...`);
        const defaultBranch = await getDefaultBranch(token, owner, repo);
        const baseSHA = await getDefaultBranchSHA(token, forkOwner, repo, defaultBranch);

        // Step 4: Create branch
        console.log(`[AutoFix] Step 4: Creating branch ${branchName}...`);
        await createBranch(token, forkOwner, repo, branchName, baseSHA);

        // Step 5: Commit the fix
        console.log(`[AutoFix] Step 5: Committing fix to ${issue.file_path}...`);
        await commitFile(
            token,
            forkOwner,
            repo,
            issue.file_path,
            issue.suggested_fix,
            `fix: ${issue.description.substring(0, 50)}`,
            branchName
        );

        // Step 6: Create PR
        console.log(`[AutoFix] Step 6: Opening PR...`);
        const pr = await createPullRequest(
            token,
            owner,
            repo,
            prTitle,
            prBody,
            `${forkOwner}:${branchName}`,
            defaultBranch
        );

        // Step 7: Update issue + create contribution record
        await supabase
            .from("detected_issues")
            .update({
                status: "pr_created",
                pr_url: pr.url,
                updated_at: new Date().toISOString(),
            })
            .eq("id", issueId);

        const { data: repository } = await supabase
            .from("repositories")
            .select("id")
            .eq("name", `${owner}/${repo}`.toLowerCase())
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (repository) {
            await supabase.from("contributions").insert({
                profile_id: auth.userId,
                repository_id: repository.id,
                pr_url: pr.url,
                status: "open",
                pr_title: prTitle,
                pr_body: prBody,
                branch_name: branchName,
                fork_owner: forkOwner,
            });
        }

        console.log(`[AutoFix] Success! PR: ${pr.url}`);

        return NextResponse.json({
            success: true,
            prUrl: pr.url,
            prNumber: pr.number,
            branchName,
            forkOwner,
        });
    } catch (error: any) {
        console.error("AutoFix Apply API Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}
