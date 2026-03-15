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
- An InvokeAI installation with a `databases/invokeai.db` file

### Installation

```bash
# Clone the repo
git clone https://github.com/cochbild/invoke-ai-reports.git
cd invoke-ai-reports

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# or: source .venv/Scripts/activate  # Windows Git Bash

# Install
pip install -e ".[dev]"
```

### Running

```bash
invoke-ai-reports
```

Open `http://localhost:9876` in your browser. On first run, you'll be prompted to provide your InvokeAI installation path.

### Configuration

Environment variables (prefix `INVOKE_REPORTS_`):

| Variable | Default | Description |
|----------|---------|-------------|
| `INVOKE_REPORTS_PORT` | `9876` | Server port |
| `INVOKE_REPORTS_HOST` | `127.0.0.1` | Server host |
| `INVOKE_REPORTS_APP_DB_PATH` | `reports.db` | Path to app database |

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest -v

# Run the backend in dev mode
uvicorn backend.app.main:app --reload --port 9876
```

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
| Testing | pytest |

## License

MIT
