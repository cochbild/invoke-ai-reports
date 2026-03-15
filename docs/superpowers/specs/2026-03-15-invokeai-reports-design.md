# InvokeAI Reports — Design Specification

## Overview

InvokeAI Reports is a web-based analytics dashboard that reads an InvokeAI installation's SQLite database and presents usage statistics through interactive charts and tables. It helps users understand their image generation patterns — model preferences, prompt habits, parameter trends, and more.

The application runs locally, requires no authentication, and is designed to visually match InvokeAI's dark-themed web interface. It may eventually be packaged for inclusion in InvokeAI proper.

**Repository:** https://github.com/cochbild/invoke-ai-reports

## Architecture

### Split Dev, Unified Deploy

- **Development:** React dev server (Vite) on one port, FastAPI on another. Vite proxies API calls to FastAPI.
- **Production:** `npm run build` produces static files. FastAPI serves them alongside the REST API. Single process, single port.

This matches InvokeAI's own deployment pattern.

### Data Flow

```
InvokeAI DB (invokeai.db) → Importer (read-only) → App DB (reports.db) → FastAPI → React UI
```

The importer reads InvokeAI's SQLite database in read-only mode, parses JSON metadata blobs from the `images` table, and flattens them into denormalized tables in the app's own `reports.db`. All analytics queries run against `reports.db`, never the source database.

### Importer Behavior

The importer connects to InvokeAI's `invokeai.db` using `?mode=ro` (read-only) and reads from:

- **`images` table** — columns: `image_name`, `user_id`, `created_at`, `starred`, `has_workflow`, `metadata` (JSON blob). The `metadata` JSON contains: `generation_mode`, `model` (object with `name`, `base`, `key`), `positive_prompt`, `negative_prompt`, `width`, `height`, `seed`, `steps`, `cfg_scale`, `scheduler`, `loras` (array of objects with `model.name` and `weight`).
- **`session_queue` table** — columns: `item_id`, `user_id`, `batch_id`, `status`, `created_at`, `started_at`, `completed_at`, `error_type`, `error_message`, `session` (JSON blob containing graph execution data with model references).
- **`users` table** — columns: `user_id`, `display_name`, `email`.

**Import strategy: full replace.** Each sync drops and recreates all app tables, then re-imports everything. This is simple and guarantees consistency. The database is small enough (tens of thousands of rows) that full re-import completes in seconds. Incremental sync is a future optimization.

**Concurrency guard:** The sync endpoint uses a server-side lock. If a sync is already in progress, subsequent requests return HTTP 409 Conflict with a message indicating sync is already running.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18+ with TypeScript |
| Build tool | Vite |
| UI library | Chakra UI (dark theme) |
| Charting | Recharts |
| State management | React hooks + context (no Redux needed for read-only dashboard) |
| Backend framework | Python + FastAPI |
| ORM | SQLAlchemy |
| Database | SQLite (app's own `reports.db`) |
| Package format | pip-installable Python package |

## Repository Structure

```
invoke-ai-reports/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point, static file serving
│   │   ├── config.py            # Settings (DB paths, port, etc.)
│   │   ├── database.py          # SQLAlchemy models & connection
│   │   └── importer.py          # Snapshot InvokeAI DB → app DB
│   ├── routers/
│   │   ├── stats.py             # Model/scheduler/resolution stats
│   │   ├── prompts.py           # Prompt analysis endpoints
│   │   ├── trends.py            # Time-series data
│   │   ├── users.py             # User list & per-user filtering
│   │   └── sync.py              # Import/sync trigger
│   └── services/
│       ├── analytics.py         # Core stat computation logic
│       └── prompt_analyzer.py   # Tokenize & analyze prompts
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI (charts, cards, filters)
│   │   ├── pages/               # Overview, Models, Prompts, Trends, Generation, Setup, Settings
│   │   ├── hooks/               # Data fetching & state hooks
│   │   ├── api/                 # API client functions
│   │   └── theme/               # Chakra UI theme (dark, InvokeAI-style)
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── README.md
├── LICENSE
├── .gitignore
└── pyproject.toml
```

## App Database Schema

The importer flattens InvokeAI's JSON metadata into proper columns for fast SQL queries.

### `generations`

The core table. One row per generated image.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| image_name | TEXT UNIQUE | From InvokeAI (unique, used for dedup on re-import) |
| user_id | TEXT | InvokeAI user ID |
| created_at | DATETIME | When the image was generated |
| generation_mode | TEXT | e.g., sdxl_txt2img, flux_txt2img |
| model_name | TEXT | e.g., "Juggernaut XL v9" |
| model_base | TEXT | e.g., sdxl, flux, sd-3, z-image |
| model_key | TEXT | InvokeAI's model UUID |
| positive_prompt | TEXT | Full positive prompt text |
| negative_prompt | TEXT | Full negative prompt text |
| width | INTEGER | Image width in pixels |
| height | INTEGER | Image height in pixels |
| seed | INTEGER | Generation seed |
| steps | INTEGER | Number of diffusion steps |
| cfg_scale | REAL | CFG scale value |
| scheduler | TEXT | Scheduler name |
| starred | BOOLEAN | Whether the image is starred |
| has_workflow | BOOLEAN | Whether a workflow was attached |

### `generation_loras`

Separate table because one generation can use multiple LoRAs.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| generation_id | INTEGER FK | References generations.id |
| lora_name | TEXT | LoRA model name |
| lora_weight | REAL | LoRA weight used |

### `queue_items`

Imported from InvokeAI's session_queue for timing and error analysis.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| user_id | TEXT | InvokeAI user ID |
| batch_id | TEXT | Batch identifier |
| session_id | TEXT | Links to generations via image session |
| model_name | TEXT | Extracted from session JSON graph data |
| model_base | TEXT | Extracted from session JSON graph data |
| status | TEXT | completed, failed, canceled |
| created_at | DATETIME | When queued |
| started_at | DATETIME | When execution began |
| completed_at | DATETIME | When execution finished |
| error_type | TEXT | Error classification (if failed) |
| error_message | TEXT | Error details (if failed) |

The importer extracts model info from the session queue's `session` JSON blob (which contains the execution graph with model node references). This enables "failure rate by model" analysis without needing a foreign key join to `generations`.

### `users`

Imported from InvokeAI's users table during sync.

| Column | Type | Description |
|--------|------|-------------|
| user_id | TEXT PK | InvokeAI user ID |
| display_name | TEXT | User's display name |
| image_count | INTEGER | Total images by this user (computed during import) |

### `sync_history`

Tracks import operations for auditability.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| source_path | TEXT | InvokeAI installation path |
| synced_at | DATETIME | When the sync ran |
| images_imported | INTEGER | Number of images imported |
| queue_items_imported | INTEGER | Number of queue items imported |

## API Endpoints

All stats endpoints accept optional query parameters:
- `user_id` — filter to a specific user (omit for aggregate)
- `start_date` — ISO date string, inclusive
- `end_date` — ISO date string, inclusive

### Sync

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sync` | Trigger import. Body: `{ "invoke_path": "..." }` |
| GET | `/api/sync/status` | Last sync time, source path, counts |

### Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List users with display name and image count |

### Overview Stats

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stats/overview` | KPI cards: total images, models used, top model, date range |

### Model Stats

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stats/models/top` | Top N models by generation count |
| GET | `/api/stats/models/least` | Least used models |
| GET | `/api/stats/models/by-family` | Top model within each family |
| GET | `/api/stats/models/family-distribution` | Family → count for pie chart |
| GET | `/api/stats/models/family-trends` | Time-series: family usage over time |
| GET | `/api/stats/models/leaderboard` | Full table: name, family, count, avg steps, avg CFG, common resolution, first/last used |
| GET | `/api/stats/models/lora-pairings` | Model + LoRA co-occurrence table |

### Prompt Stats

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stats/prompts/top-tokens` | Most frequent tokens with counts. Accepts `?limit=N` (default 20 for bar chart, use higher limit like 200 for word cloud) |
| GET | `/api/stats/prompts/token-pairs` | Common token co-occurrences |
| GET | `/api/stats/prompts/length-distribution` | Histogram buckets of prompt word counts |
| GET | `/api/stats/prompts/negative` | Negative prompt token analysis |

### Trend Stats

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stats/trends/volume` | Generation count over time (`?granularity=day\|week\|month`) |
| GET | `/api/stats/trends/heatmap` | Activity by day-of-week and hour |
| GET | `/api/stats/trends/parameters` | Avg steps, CFG over time |
| GET | `/api/stats/trends/model-adoption` | First/last use date per model |

### Generation Stats

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stats/generation/resolutions` | Resolution frequency |
| GET | `/api/stats/generation/schedulers` | Scheduler distribution |
| GET | `/api/stats/generation/steps` | Steps histogram |
| GET | `/api/stats/generation/cfg` | CFG scale histogram |
| GET | `/api/stats/generation/loras` | LoRA usage stats |
| GET | `/api/stats/generation/errors` | Failure rates by model, error types |

### Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | Current config (invoke_path, last sync, etc.) |
| PUT | `/api/settings` | Update config. Body: `{ "invoke_path": "..." }` |
| POST | `/api/settings/clear` | Drop app data, reset to first-run state |

### Validation

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/validate-path` | Check if path contains valid InvokeAI DB. Returns preview counts. |

## Dashboard Pages

### Persistent Top Bar

- App logo/name: "InvokeAI Reports"
- Navigation tabs: Overview, Models, Prompts, Trends, Generation
- User dropdown: "All Users" default, lists detected users
- Date range: preset buttons (7d, 30d, 90d, All) + custom date picker
- Sync button: triggers manual re-import

### Page 1: Overview

At-a-glance summary. The landing page.

- **4 KPI cards:** Total images, Models used, Favorite model, Active since date
- **Top 5 Models:** Horizontal bar chart
- **Model Family Distribution:** Donut chart (SDXL, Flux, SD3, etc.)
- **Generation Activity:** Area chart sparkline — images per day/week

### Page 2: Models

Deep dive into model usage patterns.

- **Most Used by Family:** Grouped bar chart — top model within each family
- **Least Used Models:** Table sorted ascending by generation count
- **Model Family Trends:** Stacked area chart — family usage over time
- **Model + LoRA Pairings:** Table — which LoRAs pair with which models
- **Full Model Leaderboard:** Sortable table — name, family, count, avg steps, avg CFG, common resolution, first used, last used

### Page 3: Prompts

Prompt analysis and patterns.

- **Token Word Cloud:** Interactive word cloud sized by frequency
- **Top 20 Tokens:** Horizontal bar chart
- **Common Token Pairs:** Table of frequently co-occurring tokens
- **Prompt Length Distribution:** Histogram of word counts
- **Negative Prompt Analysis:** Top negative tokens, % of images using negative prompts

### Page 4: Trends

Time-series analysis.

- **Generation Volume:** Line chart with day/week/month granularity toggle
- **Model Adoption Timeline:** When each model was first/last used
- **Parameter Evolution:** Line chart — avg steps, avg CFG over time
- **Activity Heatmap:** GitHub-style grid — generation activity by day-of-week and hour

### Page 5: Generation

Generation parameter analysis.

- **Resolution Distribution:** Bar chart of most common resolutions/aspect ratios
- **Scheduler Usage:** Pie chart of scheduler distribution
- **Steps Distribution:** Histogram of step counts, avg by model family
- **CFG Scale Distribution:** Histogram of CFG values, avg by model family
- **LoRA Usage:** Bar chart of most used LoRAs, % of images using any LoRA
- **Error/Failure Rate:** From queue data — failure % by model, common error types

## First-Run & Setup Flow

1. **Welcome screen:** "Welcome to InvokeAI Reports" with a text input for the InvokeAI installation path. Validates that `databases/invokeai.db` exists at the given path.
2. **Validation feedback:** On valid path, the backend does a quick read-only scan of the source DB (`SELECT COUNT(*) FROM images`, `SELECT COUNT(DISTINCT user_id) FROM images`, count of distinct model names from metadata) and shows a preview: "Found database with X images, Y unique models, Z users. Ready to import." On invalid path, shows error with help text.
3. **Import:** User clicks "Import Data". Progress indicator during import. On completion: "Imported X images, Y queue items. Redirecting to dashboard..."
4. **Subsequent launches:** App remembers the configured path. Goes straight to dashboard. Sync button and Settings page available for changes.
5. **Settings page:** Change InvokeAI install path, view sync history (table of past imports with timestamps and counts), clear app data (drops `reports.db` and returns to welcome screen). Accessible via a gear icon in the top bar.

## Multi-User

- Users are auto-detected from InvokeAI's `users` table during import
- User dropdown in the top bar filters all stats endpoints
- "All Users" (default) shows aggregate data across all users
- No authentication in this app — anyone with local access sees all users' stats
- If InvokeAI has only one user, the dropdown still appears but is informational

## Prompt Tokenization Strategy

Prompts are tokenized using comma-splitting first, then whitespace-splitting within each segment. This matches how Stable Diffusion prompts are typically structured (comma-separated phrases).

1. Split on commas to get phrases
2. Strip whitespace from each phrase
3. Lowercase and deduplicate within a single prompt
4. Filter out stopwords (a, the, of, in, with, etc.) and very short tokens (1-2 chars)
5. Handle parenthesized weight syntax: `(word:1.2)` → extract `word`, discard the weight
6. Handle InvokeAI's prompt syntax: ignore BREAK tokens and other control tokens

The `/api/stats/prompts/top-tokens` endpoint returns `[{ "token": "...", "count": N }]` sorted descending by count. The word cloud and bar chart both consume this same endpoint with different `limit` values.

## Design & Visual Style

- Dark theme matching InvokeAI's aesthetic (dark backgrounds, muted borders, accent colors)
- Chakra UI's dark color mode as the base
- Consistent color palette for chart series across all pages
- Responsive layout but optimized for desktop (primary use case)
- Clean typography, minimal chrome, data-forward design

## Deployment

- **Install:** `pip install invoke-ai-reports` (or `pip install .` from source)
- **Run:** `invoke-ai-reports` CLI command starts FastAPI on localhost
- **Access:** Open `http://localhost:<port>` in browser
- **No Docker, no external services, no cloud dependencies**
- Frontend is pre-built and bundled into the Python package

## Future Considerations

- If adopted by InvokeAI, auth would layer onto InvokeAI's existing user/session system
- Incremental sync could replace full re-import for large databases
- Semantic prompt clustering (NLP-based) as an advanced feature
- Export/share reports as PDF or image
