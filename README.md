# InvokeAI Reports

A web-based analytics dashboard that reads your InvokeAI installation's SQLite database and presents usage statistics through interactive charts and tables. Understand your image generation patterns — model preferences, prompt habits, parameter trends, and more.

## Features

- **Model Analytics** — Top models, family distribution, model leaderboard with usage stats
- **Prompt Analysis** — Token frequency, word clouds, prompt length distribution
- **Trend Tracking** — Generation volume over time, parameter evolution, activity heatmaps
- **Generation Stats** — Resolution distribution, scheduler usage, LoRA statistics, error rates
- **Multi-User** — Auto-detects users from InvokeAI, filterable per-user or aggregate
- **Date Filtering** — Custom date ranges with preset shortcuts (7d, 30d, 90d, all-time)

## Architecture

```
InvokeAI DB (invokeai.db) → Importer (read-only) → App DB (reports.db) → FastAPI → React UI
```

The importer reads InvokeAI's database in read-only mode, parses JSON metadata, and flattens it into the app's own `reports.db`. All analytics queries run against the app database, never the source.

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+ (only needed if building the frontend from source)
- An InvokeAI installation with a `databases/invokeai.db` file

### Installation

```bash
git clone https://github.com/cochbild/invoke-ai-reports.git
cd invoke-ai-reports

# Set up Python backend
python -m venv .venv
pip install -r requirements.txt

# Build the frontend
cd frontend
npm install
npm run build
cd ..
```

### Running on Windows

From **PowerShell** or **Command Prompt**:

```powershell
.venv\Scripts\activate
uvicorn backend.app.main:app --port 9876
```

From **Git Bash** (MINGW):

```bash
source .venv/Scripts/activate
uvicorn backend.app.main:app --port 9876
```

Open `http://localhost:9876` in your browser. On first run, enter your InvokeAI installation path (e.g., `G:\InvokeUi` or `C:\Users\you\InvokeAI`).

### Running on Linux / WSL

```bash
source .venv/bin/activate
uvicorn backend.app.main:app --port 9876
```

Open `http://localhost:9876`. When prompted for the InvokeAI path:

- **Native Linux:** Enter the path directly (e.g., `/home/user/invokeai`)
- **WSL accessing a Windows drive:** Use the WSL mount path (e.g., `/mnt/g/InvokeUi`) or the Windows path (`G:\InvokeUi`) — both are accepted

### Path Flexibility

The setup page accepts any of these path formats:

| Input | What it finds |
|-------|--------------|
| `G:\InvokeUi` | `G:\InvokeUi\databases\invokeai.db` |
| `G:\InvokeUi\databases` | `G:\InvokeUi\databases\invokeai.db` |
| `G:\InvokeUi\databases\invokeai.db` | Exact file path |
| `/mnt/g/InvokeUi` | `/mnt/g/InvokeUi/databases/invokeai.db` (WSL) |

### Configuration

Environment variables (prefix `INVOKE_REPORTS_`):

| Variable | Default | Description |
|----------|---------|-------------|
| `INVOKE_REPORTS_PORT` | `9876` | Server port |
| `INVOKE_REPORTS_HOST` | `127.0.0.1` | Server host |
| `INVOKE_REPORTS_APP_DB_PATH` | `reports.db` | Path to app database |

## Development

### Backend

```bash
# Activate venv
source .venv/Scripts/activate  # Windows Git Bash
# or: source .venv/bin/activate  # Linux/Mac

# Install dev dependencies
pip install -e ".[dev]"

# Run backend tests
pytest -v

# Run backend with hot reload
uvicorn backend.app.main:app --reload --port 9876
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run dev server (proxies /api to backend on port 9876)
npm run dev

# Run frontend tests
npx vitest run

# Production build
npm run build
```

During development, run the backend (`uvicorn ... --port 9876`) and frontend dev server (`npm run dev`) simultaneously. The Vite dev server proxies `/api` requests to the backend.

## API Endpoints

All stats endpoints accept optional `user_id`, `start_date`, and `end_date` query parameters.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sync` | Trigger data import |
| GET | `/api/sync/status` | Last sync info |
| GET | `/api/users` | List users |
| GET | `/api/stats/overview` | KPI summary |
| GET | `/api/stats/models/top` | Top models by usage |
| GET | `/api/stats/models/least` | Least used models |
| GET | `/api/stats/models/family-distribution` | Model family breakdown |
| GET | `/api/stats/models/leaderboard` | Full model stats table |
| GET | `/api/stats/prompts/top-tokens` | Most frequent prompt tokens |
| GET | `/api/stats/prompts/length-distribution` | Prompt length histogram |
| GET | `/api/stats/trends/volume` | Generation count over time |
| GET | `/api/stats/trends/heatmap` | Activity by day/hour |
| GET | `/api/stats/trends/parameters` | Avg steps/CFG over time |
| GET | `/api/stats/generation/resolutions` | Resolution frequency |
| GET | `/api/stats/generation/schedulers` | Scheduler distribution |
| GET | `/api/stats/generation/steps` | Steps histogram |
| GET | `/api/stats/generation/cfg` | CFG scale histogram |
| GET | `/api/stats/generation/loras` | LoRA usage stats |
| GET | `/api/stats/generation/errors` | Failure rates and error types |
| POST | `/api/validate-path` | Check InvokeAI DB path |
| GET | `/api/settings` | Current config |
| PUT | `/api/settings` | Update config |
| POST | `/api/settings/clear` | Reset to first-run state |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, SQLAlchemy, SQLite |
| Frontend | React, TypeScript, Vite, Chakra UI, Recharts |
| Testing | pytest, Vitest |

## License

MIT
