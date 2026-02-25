import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchRepoMetadata, fetchFileTree } from "@/lib/github";

export async function POST(req: NextRequest) {
    try {
        const { owner, repo } = await req.json();

        if (!owner || !repo) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const supabase = createAdminClient();
        const repoFullName = `${owner}/${repo}`.toLowerCase();

        const metadata = await fetchRepoMetadata(owner, repo);
        const treeData = await fetchFileTree(owner, repo, metadata.default_branch || 'main');

        let healthScore = 50; // Base score
        const metrics: Record<string, any> = {};

        // 1. README check
        const hasReadme = treeData.tree.some((f: any) => f.path.toLowerCase().includes('readme.md'));
        if (hasReadme) {
            healthScore += 15;
            metrics['readme'] = 'Present';
        } else {
            metrics['readme'] = 'Missing';
        }

        // 2. Tests directory
        const hasTests = treeData.tree.some((f: any) => f.path.includes('test') || f.path.includes('__tests__') || f.path.includes('.spec.'));
        if (hasTests) {
            healthScore += 15;
            metrics['tests'] = 'Present';
        } else {
            metrics['tests'] = 'Missing';
        }

        // 3. Activity (Updated recently)
        const lastUpdateDate = new Date(metadata.updated_at).getTime();
        const now = new Date().getTime();
        const daysSinceUpdate = (now - lastUpdateDate) / (1000 * 3600 * 24);

        if (daysSinceUpdate < 7) {
            healthScore += 20;
            metrics['activity'] = 'High';
        } else if (daysSinceUpdate < 30) {
            healthScore += 10;
            metrics['activity'] = 'Moderate';
        } else {
            metrics['activity'] = 'Low';
        }

        // Optional: Fetch open issues from github
        const prsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?labels=good%20first%20issue&state=open`);
        if (prsRes.ok) {
            const issues = await prsRes.json();
            metrics['goodFirstIssuesCount'] = issues.length;
            if (issues.length > 0) healthScore += 10; // Bonus for beginner friendliness
        }

        // Ensure capping
        healthScore = Math.min(100, Math.max(0, healthScore));

        // Get Repo ID to link Health score
        const { data: repository } = await supabase.from('repositories').select('id').eq('name', repoFullName).single();

        if (repository) {
            await supabase.from('health_scores').upsert({
                repository_id: (repository as any).id,
                score: healthScore,
                metrics
            } as any);
        }

        return NextResponse.json({ success: true, healthScore, metrics });

    } catch (error: any) {
        console.error("Health API Error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: error.message }, { status: 500 });
    }
}
