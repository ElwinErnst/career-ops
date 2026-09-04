# LinkedIn Jobs Monitor Integration

`career-ops` can consume jobs discovered by an external LinkedIn monitor without coupling the scanner to LinkedIn itself.

## Architecture

```text
ChatGPT LinkedIn monitor
        │
        ▼
data/linkedin-jobs.jsonl
        │
        ▼
node import-linkedin-monitor.mjs
        │
        ├──► data/pipeline.md
        └──► data/scan-history.tsv
                    │
                    ▼
          /career-ops pipeline
```

The monitor is responsible only for **discovery and first-pass relevance**. `career-ops` remains responsible for evaluation, comparison, tracking and application workflow.

## Feed format

The feed is newline-delimited JSON (`JSONL`). Each line represents one job.

Required fields:

```json
{"title":"Software Engineer","company":"Acme","url":"https://www.linkedin.com/jobs/view/1234567890"}
```

Recommended fields:

```json
{
  "title": "Software Engineer",
  "company": "Acme",
  "url": "https://www.linkedin.com/jobs/view/1234567890",
  "location": "Argentina",
  "workplace": "remote",
  "published_at": "2026-09-03",
  "found_at": "2026-09-03T18:00:00-03:00",
  "requirements": ["TypeScript", "React", "Node.js"],
  "match": "high",
  "match_reason": "Strong fit for React/TypeScript/Node stack",
  "active": true,
  "source": "LinkedIn Monitor"
}
```

Unknown optional fields are ignored by the importer, so the contract can evolve without breaking ingestion.

## Import

Run from the repository root:

```bash
node import-linkedin-monitor.mjs
```

The importer:

1. reads `data/linkedin-jobs.jsonl`;
2. canonicalizes LinkedIn job URLs to `/jobs/view/{id}` when possible;
3. skips URLs already present in `data/scan-history.tsv`;
4. skips URLs already present in `data/pipeline.md`;
5. records expired jobs as `skipped_expired`;
6. adds new jobs to the `## Pendientes` section of `data/pipeline.md`;
7. records every newly processed URL in `data/scan-history.tsv`.

It is safe to run repeatedly.

## Monitor contract

The LinkedIn monitor should keep the feed as a **snapshot of relevant jobs it has discovered**, one JSON object per line. The importer provides the persistent deduplication layer, so repeated records in future monitor runs will not be re-added to the pipeline.

The monitor should prefer direct LinkedIn job URLs and mark known closed listings with `"active": false` or `"status": "expired"`.

## Why this is separate from `modes/scan.md`

The existing scanner discovers jobs from company career pages, ATS APIs and web search. LinkedIn monitoring is an external discovery channel with different execution constraints. Keeping it behind a tiny data contract lets both systems evolve independently while feeding the same Career Ops pipeline.
