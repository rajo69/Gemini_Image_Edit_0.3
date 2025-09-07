# Gemini Image Chat (Next.js + Vercel)

Single-page canvas app for image generation/edits using **Gemini 2.5 Flash Image (preview)**.

## Deploy on Vercel

1. Push this folder to GitHub.
2. In Vercel → **New Project**, import the repo.
3. Add Environment Variable: `GEMINI_API_KEY = <your Google key>` (Preview & Production).
4. Deploy. Health check: open `/api/gemini/edit` → `{"ok":true,"endpoint":"gemini/edit"}`.

## Local dev

```bash
npm i
npm run dev
# Optional: set a dev-only browser key to enable direct fallback in preview
# open your browser console and run:
localStorage.setItem('GEMINI_API_KEY','<your key>')
```
