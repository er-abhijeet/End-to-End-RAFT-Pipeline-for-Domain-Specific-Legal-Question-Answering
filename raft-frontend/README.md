# RAFT / CUAD Showcase

Next.js 16 (App Router, TypeScript, Tailwind v4) showcase site for the CUAD
RAFT teacher-student pipeline: overview + glossary, results & graphs,
qualitative comparisons, and a live inference page backed by your Gradio Space.

## 1. Install & run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. Pages render fine with no data (they show an
empty-state card telling you what's missing) -- you don't need real data to
check the site works.

## 2. Wire in your real results

Run `cuad_raft_showcase_assets.ipynb` on Kaggle (after your main pipeline
notebook has produced its Hub checkpoints). It writes and zips:

```
website_assets/
├── graphs/*.png
└── data/*.json
```

Download `website_assets.zip` from Kaggle's Output panel, or from
`https://huggingface.co/datasets/<your-username>/cuad-raft-showcase-assets`,
then:

```bash
unzip website_assets.zip -d /tmp/website_assets
cp /tmp/website_assets/graphs/*.png public/graphs/
cp /tmp/website_assets/data/*.json  public/data/
```

Re-run `npm run dev` (or redeploy) -- the Results and Comparison pages read
these files server-side and will populate automatically. Nothing else needs
to change; there's no build step tied to the data.

## 3. Point the inference page at your Space

Copy `.env.local.example` to `.env.local` and set:

```
GRADIO_SPACE_URL=https://YOUR_USERNAME-YOUR_SPACE.hf.space
GRADIO_API_NAME=predict
```

`GRADIO_API_NAME` is whatever `api_name` your Space's predict function uses
(Gradio defaults to `predict` for a single-function `gr.Interface`; check the
"Use via API" link at the bottom of your Space if you're not sure). The
`/api/infer` route calls the current Gradio REST protocol
(`POST /gradio_api/call/<api_name>` then `GET .../<event_id>` over SSE) --
this replaced the older single-shot `/api/predict` endpoint, so if your Space
is pinned to an old Gradio version the route may need adjusting.

The inference page sends `{"data": [question, context]}`, matching a
two-input `(question, context) -> answer` Gradio function. If your Space's
function signature differs, edit the `data: [question, context]` line in
`src/app/api/infer/route.ts`.

## 4. Deploy to Vercel

```bash
npm install -g vercel   # if you don't have it
vercel
```

Or connect the repo at vercel.com -> New Project. Either way, set the two env
vars from step 3 in the Vercel project's Environment Variables settings
(they're server-only, not `NEXT_PUBLIC_`, so they won't leak to the browser).

No other configuration is needed -- `public/graphs` and `public/data` deploy
as static files automatically.

## Project structure

```
src/app/page.tsx              Overview: hero, stats, 5-clause pipeline explainer
src/app/results/page.tsx      Metrics table + all graphs
src/app/comparison/page.tsx   Per-example zero-shot vs RAG vs RAFT cards
src/app/inference/page.tsx    Live inference form (client component)
src/app/api/infer/route.ts    Server-side proxy to the Gradio Space
src/lib/data.ts                Reads public/data/*.json server-side
src/components/                Nav, Footer, ClauseHeading, GlossaryTerm,
                                StatCallout, MetricsTable, ExampleCard, EmptyState
```
