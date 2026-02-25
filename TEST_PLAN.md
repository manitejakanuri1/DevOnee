# DevOne Testing & Deployment Plan

## 1. Environment Configuration Checklist (Vercel)
Before deploying, ensure the following environment variables are securely added to your Vercel project settings:
- [ ] `GITHUB_ID` & `GITHUB_SECRET` (OAuth App Credentials)
- [ ] `NEXTAUTH_SECRET` (Secure random string) & `NEXTAUTH_URL` (Set to Vercel production URL)
- [ ] `GITHUB_TOKEN` (A PAT with repo reading permissions for API limits)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (Used securely on the backend)
- [ ] `GEMINI_API_KEY` (For Gemini 2.5 Flash access)
- [ ] `SENTRY_DSN` & `SENTRY_AUTH_TOKEN` (For error tracking)

---

## 2. Comprehensive Test Plan

### A. Authentication & Usage
- **Guest Limits**: 
  - [ ] Visit the site without logging in.
  - [ ] Generate 20 plans (or spoof the cookie count) to verify the `LIMIT_EXCEEDED` 429 response is triggered.
  - [ ] Verify the UI shows a "Login to continue" modal.
- **GitHub OAuth**:
  - [ ] Click login, authenticate via GitHub.
  - [ ] Verify the user is redirected back properly and their profile exists in the Supabase `profiles` table.
  - [ ] Verify the usage limit is bumped up to 100 on the backend.

### B. Repository Ingestion & Dashboards
- **Ingestion**:
  - [ ] Submit a public repository (e.g., `facebook/react`).
  - [ ] Verify Supabase `embeddings` table receives chunked vectors.
- **Dashboard Load**:
  - [ ] Navigate to `/repo/facebook/react`.
  - [ ] Verify the Health Score heuristic calculates properly (README presence, etc).
  - [ ] View the **Evolution Story** tab and ensure OpenRouter translates git history into a cohesive JSON narrative.
  - [ ] Open the **Topology Graph** tab and verify nodes render without freezing the browser (limit set to 100).

### C. Learning & AI Interfacing
- **Onboarding Plan**:
  - [ ] Generate a plan. Ensure the backend parses the Persona (e.g. "Junior Developer") correctly.
  - [ ] Verify the output UI renders checkboxes, file links, and difficulty badges correctly.
- **Chat Mentor (RAG)**:
  - [ ] Open the Sidebar Mentor. Ask a general question. 
  - [ ] Open the File Explorer, check 3 files, and ask a specific question.
  - [ ] Verify the response references the selected files accurately using the "Concept -> Analogy -> Example" persona.

### D. Contribution Sandbox
- **Blob Viewer**:
  - [ ] Click a file link from the onboarding plan. 
  - [ ] Verify the syntax highlighter accurately renders the file content via the internal GitHub content API.
- **Suggestion Generation**:
  - [ ] Click "Find a Task for Me" in the Sandbox tab.
  - [ ] Verify the AI suggests a low-risk "Good First Issue".
- **Simulated Review**:
  - [ ] Change the code in the interactive Editor.
  - [ ] Click "Submit to Sandbox Review" and ensure constructive criticism is returned.
- **PR Creation (Mock)**:
  - [ ] Click "Create PR to GitHub".
  - [ ] Verify the mock success modal appears capturing the `branchName` and returning a fabricated link.

### E. Gamification & Profiles
- **Profile Rendering**:
  - [ ] Navigate to `/profile`.
  - [ ] Verify mock streaks, scores, and badges display properly.
- **Community Insights**:
  - [ ] Check if the `POST /api/insights` and `GET /api/insights` accurately store JSON rows in Supabase.
