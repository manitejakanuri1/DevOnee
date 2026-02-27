const GITHUB_API = "https://api.github.com";

function authHeaders(token: string) {
    return {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DevOne-App",
    };
}

export async function forkRepository(
    token: string,
    owner: string,
    repo: string
): Promise<{ owner: string; full_name: string }> {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/forks`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ default_branch_only: true }),
    });

    // 202 = fork created, 409 = fork already exists
    if (res.status === 409) {
        // Fork already exists, get the user's fork
        const userRes = await fetch(`${GITHUB_API}/user`, {
            headers: authHeaders(token),
        });
        const user = await userRes.json();
        return { owner: user.login, full_name: `${user.login}/${repo}` };
    }

    if (!res.ok) {
        throw new Error(`Fork failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    return { owner: data.owner.login, full_name: data.full_name };
}

export async function waitForFork(
    token: string,
    owner: string,
    repo: string,
    maxRetries = 15
): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
        const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
            headers: authHeaders(token),
        });
        if (res.ok) {
            const data = await res.json();
            // Check that the fork is not empty (has a default branch)
            if (data.default_branch) return true;
        }
        await new Promise((r) => setTimeout(r, 2000));
    }
    return false;
}

export async function getDefaultBranch(
    token: string,
    owner: string,
    repo: string
): Promise<string> {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(`Get repo failed: ${res.status}`);
    const data = await res.json();
    return data.default_branch || "main";
}

export async function getDefaultBranchSHA(
    token: string,
    owner: string,
    repo: string,
    branch: string
): Promise<string> {
    const res = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${branch}`,
        { headers: authHeaders(token) }
    );
    if (!res.ok) throw new Error(`Get branch SHA failed: ${res.status}`);
    const data = await res.json();
    return data.object.sha;
}

export async function createBranch(
    token: string,
    owner: string,
    repo: string,
    branchName: string,
    sha: string
): Promise<void> {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha }),
    });
    if (!res.ok) throw new Error(`Create branch failed: ${res.status}`);
}

export async function commitFile(
    token: string,
    owner: string,
    repo: string,
    filePath: string,
    content: string,
    message: string,
    branch: string
): Promise<void> {
    // Get the current file SHA if it exists (required for updates)
    let fileSha: string | undefined;
    try {
        const existing = await fetch(
            `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
            { headers: authHeaders(token) }
        );
        if (existing.ok) {
            const data = await existing.json();
            fileSha = data.sha;
        }
    } catch {
        // File doesn't exist yet, that's fine
    }

    const body: Record<string, unknown> = {
        message,
        content: Buffer.from(content).toString("base64"),
        branch,
    };
    if (fileSha) body.sha = fileSha;

    const res = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
        {
            method: "PUT",
            headers: authHeaders(token),
            body: JSON.stringify(body),
        }
    );
    if (!res.ok) {
        throw new Error(`Commit file failed: ${res.status} ${await res.text()}`);
    }
}

export async function createPullRequest(
    token: string,
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string
): Promise<{ url: string; number: number }> {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ title, body, head, base }),
    });
    if (!res.ok) {
        throw new Error(`Create PR failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    return { url: data.html_url, number: data.number };
}
