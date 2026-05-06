# Contributing

Thanks for your interest in improving InvokeAI Reports.

## Quick start

1. Fork the repo and clone your fork.
2. Create a branch named for the change (e.g. `feature/heatmap-tooltip`, `fix/sync-409`).
3. Make your changes (see Development below).
4. Run the test suites and verify the app starts.
5. Open a PR against `main`.

## Development

This project uses [uv](https://docs.astral.sh/uv/) for Python dependency management.

```bash
# Install uv (https://docs.astral.sh/uv/getting-started/installation/)
# Then sync the locked environment
uv sync --dev

# Run backend tests
uv run pytest -v

# Run backend with hot reload
uv run uvicorn backend.app.main:app --reload --port 9876
```

Frontend:

```bash
cd frontend
npm install
npm run dev          # dev server on :5173, proxies /api to :9876
npx vitest run       # tests
npm run build        # production build
```

## Pull request guidelines

- One logical change per PR — keep diffs reviewable.
- Add or update tests for behavior changes.
- Run `uv run pytest -v` and `npx vitest run` before pushing.
- Match existing code style; do not reformat unrelated files.
- Reference the issue number in the PR description if one exists.
- Sign off your commits with `git commit -s` if possible.

## Reporting issues

Use the [bug report](.github/ISSUE_TEMPLATE/bug_report.md) or [feature request](.github/ISSUE_TEMPLATE/feature_request.md) templates. For security vulnerabilities, see [SECURITY.md](SECURITY.md) — do not file a public issue.

This is a personal side project maintained on a best-effort basis. Issues and PRs may sit for a while before getting attention — please don't take it personally.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating you agree to abide by its terms.
