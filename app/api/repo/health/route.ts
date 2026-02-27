import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchRepoMetadata, fetchFileTree } from "@/lib/github";

interface BreakdownItem {
    score: number;
    max: number;
    label: string;
    detail: string;
}

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
        const filePaths = treeData.tree.map((f: any) => f.path?.toLowerCase() || "");

        let healthScore = 0;
        const metrics: Record<string, any> = {};
        const breakdown: Record<string, BreakdownItem> = {};

        // ── 1. README (0–15) ───────────────────────────────────
        const hasReadme = filePaths.some((p: string) => p.match(/^readme(\.\w+)?$/));
        const readmeScore = hasReadme ? 15 : 0;
        healthScore += readmeScore;
        metrics['readme'] = hasReadme ? 'Present' : 'Missing';
        breakdown['readme'] = {
            score: readmeScore,
            max: 15,
            label: 'README',
            detail: hasReadme ? 'README file found' : 'No README file detected',
        };

        // ── 2. Tests (0–15) ───────────────────────────────────
        const testFiles = filePaths.filter((p: string) =>
            p.includes('test') || p.includes('__tests__') ||
            p.includes('.spec.') || p.includes('.test.')
        );
        const hasTests = testFiles.length > 0;
        const testScore = hasTests ? (testFiles.length >= 5 ? 15 : 10) : 0;
        healthScore += testScore;
        metrics['tests'] = hasTests ? 'Present' : 'Missing';
        breakdown['tests'] = {
            score: testScore,
            max: 15,
            label: 'Test Coverage',
            detail: hasTests ? `${testFiles.length} test file(s) found` : 'No test files detected',
        };

        // ── 3. Activity (0–20) ─────────────────────────────────
        const lastUpdateDate = new Date(metadata.updated_at).getTime();
        const now = Date.now();
        const daysSinceUpdate = (now - lastUpdateDate) / (1000 * 3600 * 24);

        let activityScore = 0;
        let activityDetail = '';
        if (daysSinceUpdate < 7) {
            activityScore = 20;
            activityDetail = `Updated ${Math.round(daysSinceUpdate)} days ago`;
            metrics['activity'] = 'High';
        } else if (daysSinceUpdate < 30) {
            activityScore = 12;
            activityDetail = `Updated ${Math.round(daysSinceUpdate)} days ago`;
            metrics['activity'] = 'Moderate';
        } else if (daysSinceUpdate < 90) {
            activityScore = 5;
            activityDetail = `Updated ${Math.round(daysSinceUpdate)} days ago`;
            metrics['activity'] = 'Low';
        } else {
            activityDetail = `Last updated ${Math.round(daysSinceUpdate)} days ago`;
            metrics['activity'] = 'Stale';
        }
        healthScore += activityScore;
        breakdown['activity'] = {
            score: activityScore,
            max: 20,
            label: 'Recent Activity',
            detail: activityDetail,
        };

        // ── 4. Good First Issues (0–10) ────────────────────────
        let issueScore = 0;
        let issueCount = 0;
        try {
            const prsRes = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/issues?labels=good%20first%20issue&state=open&per_page=20`,
                { headers: process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {} }
            );
            if (prsRes.ok) {
                const issues = await prsRes.json();
                issueCount = issues.length;
                if (issueCount >= 5) issueScore = 10;
                else if (issueCount > 0) issueScore = 6;
            }
        } catch { /* skip if rate-limited */ }
        healthScore += issueScore;
        metrics['goodFirstIssuesCount'] = issueCount;
        breakdown['issues'] = {
            score: issueScore,
            max: 10,
            label: 'Good First Issues',
            detail: issueCount > 0 ? `${issueCount} beginner-friendly issue(s)` : 'No good-first-issue labels',
        };

        // ── 5. LICENSE (0–10) ──────────────────────────────────
        const hasLicense = filePaths.some((p: string) => p.match(/^license(\.\w+)?$/));
        const licenseScore = hasLicense ? 10 : 0;
        healthScore += licenseScore;
        breakdown['license'] = {
            score: licenseScore,
            max: 10,
            label: 'License',
            detail: hasLicense ? 'License file present' : 'No license file found',
        };

        // ── 6. CONTRIBUTING guide (0–10) ───────────────────────
        const hasContributing = filePaths.some((p: string) => p.match(/^contributing(\.\w+)?$/));
        const contributingScore = hasContributing ? 10 : 0;
        healthScore += contributingScore;
        breakdown['contributing'] = {
            score: contributingScore,
            max: 10,
            label: 'Contributing Guide',
            detail: hasContributing ? 'CONTRIBUTING file present' : 'No contributing guide',
        };

        // ── 7. CI/CD Pipeline (0–10) ──────────────────────────
        const hasCICD = filePaths.some((p: string) =>
            p.startsWith('.github/workflows/') ||
            p === '.circleci/config.yml' ||
            p === '.travis.yml' ||
            p === 'jenkinsfile' ||
            p === '.gitlab-ci.yml'
        );
        const ciScore = hasCICD ? 10 : 0;
        healthScore += ciScore;
        breakdown['ci'] = {
            score: ciScore,
            max: 10,
            label: 'CI/CD Pipeline',
            detail: hasCICD ? 'CI/CD configuration detected' : 'No CI/CD pipeline found',
        };

        // ── 8. Community (stars + forks bonus, 0–10) ──────────
        const stars = metadata.stargazers_count || 0;
        const forks = metadata.forks_count || 0;
        let communityScore = 0;
        if (stars >= 100 || forks >= 20) communityScore = 10;
        else if (stars >= 10 || forks >= 5) communityScore = 6;
        else if (stars >= 1) communityScore = 3;
        healthScore += communityScore;
        breakdown['community'] = {
            score: communityScore,
            max: 10,
            label: 'Community',
            detail: `${stars.toLocaleString()} stars · ${forks.toLocaleString()} forks`,
        };

        // ── Clamp ──────────────────────────────────────────────
        healthScore = Math.min(100, Math.max(0, healthScore));

        // ── Persist ────────────────────────────────────────────
        const { data: repository } = await supabase
            .from('repositories')
            .select('id')
            .eq('name', repoFullName)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (repository) {
            await supabase.from('health_scores').upsert({
                repository_id: (repository as any).id,
                score: healthScore,
                metrics: { ...metrics, breakdown },
            } as any);
        }

        return NextResponse.json({ success: true, healthScore, metrics, breakdown });

    } catch (error: any) {
        console.error("Health API Error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: error.message }, { status: 500 });
    }
}
