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
                { error: "UNAUTHORIZED: Please sign in to GitHub to commit a Pull Request." },
                { status: 401 }
            );
        }

        const token = auth.accessToken;
        if (!token) {
            return NextResponse.json(
                { error: "No GitHub access token found. Please re-sign in." },
                { status: 401 }
            );
        }

        const { owner, repo, changes, prDetails, challengeId } = await req.json();

        if (!owner || !repo || !changes || !changes.length) {
            return NextResponse.json(
                { error: "Missing required parameters (owner, repo, changes)" },
                { status: 400 }
            );
        }

        const branchName = `devone-fix-${Date.now()}`;
        const prTitle = prDetails?.title || `DevOne: Automated contribution`;
        const prBody = prDetails?.body || `This pull request was created via [DevOne](https://devone.app) - AI Contribution Acceleration Platform.\n\n${prDetails?.description || ""}`;

        // Step 1: Fork the repository
        console.log(`[DevOne PR] Step 1: Forking ${owner}/${repo}...`);
        const fork = await forkRepository(token, owner, repo);
        const forkOwner = fork.owner;

        // Step 2: Wait for fork to be ready
        console.log(`[DevOne PR] Step 2: Waiting for fork ${forkOwner}/${repo}...`);
        const forkReady = await waitForFork(token, forkOwner, repo);
        if (!forkReady) {
            return NextResponse.json(
                { error: "Fork creation timed out. Please try again." },
                { status: 504 }
            );
        }

        // Step 3: Get the default branch and its SHA
        console.log(`[DevOne PR] Step 3: Getting default branch SHA...`);
        const defaultBranch = await getDefaultBranch(token, owner, repo);
        const baseSHA = await getDefaultBranchSHA(token, forkOwner, repo, defaultBranch);

        // Step 4: Create a new branch on the fork
        console.log(`[DevOne PR] Step 4: Creating branch ${branchName}...`);
        await createBranch(token, forkOwner, repo, branchName, baseSHA);

        // Step 5: Commit each file change
        console.log(`[DevOne PR] Step 5: Committing ${changes.length} file(s)...`);
        for (const change of changes) {
            await commitFile(
                token,
                forkOwner,
                repo,
                change.path,
                change.content,
                `feat: ${prTitle} - update ${change.path}`,
                branchName
            );
        }

        // Step 6: Open Pull Request from fork to upstream
        console.log(`[DevOne PR] Step 6: Opening PR...`);
        const pr = await createPullRequest(
            token,
            owner,
            repo,
            prTitle,
            prBody,
            `${forkOwner}:${branchName}`,
            defaultBranch
        );

        // Step 7: Store in database
        const supabase: any = createAdminClient();
        const repoFullName = `${owner}/${repo}`.toLowerCase();
        const { data: repository } = await supabase
            .from("repositories")
            .select("id")
            .eq("name", repoFullName)
            .single() as any;

        if (repository) {
            await (supabase as any).from("contributions").insert({
                profile_id: auth.userId,
                repository_id: repository.id,
                pr_url: pr.url,
                status: "open",
                pr_title: prTitle,
                pr_body: prBody,
                branch_name: branchName,
                fork_owner: forkOwner,
                challenge_id: challengeId || null,
            });
        }

        console.log(`[DevOne PR] Success! PR created: ${pr.url}`);

        return NextResponse.json({
            success: true,
            message: "Pull request created successfully!",
            prUrl: pr.url,
            prNumber: pr.number,
            branchUrl: `https://github.com/${forkOwner}/${repo}/tree/${branchName}`,
            branchName,
            forkOwner,
        });
    } catch (error: any) {
        console.error("Contribution Create API Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}
