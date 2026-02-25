export async function analyzePersona(githubUsername: string): Promise<string> {
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DevOne-App'
    };
    if (process.env.GITHUB_TOKEN) {
        // @ts-ignore
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    try {
        const reposRes = await fetch(`https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=10`, { headers });

        if (!reposRes.ok) {
            return "Junior Developer"; // Default fallback
        }

        const repos = await reposRes.json();

        let isTypeScriptHeavy = false;
        let isPythonHeavy = false;
        let totalStars = 0;

        for (const r of repos) {
            totalStars += r.stargazers_count;
            if (r.language === 'TypeScript') isTypeScriptHeavy = true;
            if (r.language === 'Python') isPythonHeavy = true;
        }

        if (totalStars > 50) return "Senior Developer";
        if (isTypeScriptHeavy && isPythonHeavy) return "Full Stack Mid-Level Engineer";
        if (isTypeScriptHeavy) return "Frontend/Node Specialist";

        return "Junior Developer";

    } catch (err) {
        console.warn("Persona analyzing failed, falling back to Junior.", err);
        return "Junior Developer";
    }
}
