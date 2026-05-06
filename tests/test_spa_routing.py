"""Verify that arbitrary frontend routes (not just /) return index.html so
React Router can take over after a hard refresh."""
import os

import pytest
from fastapi.testclient import TestClient

from backend.app.main import create_app


@pytest.fixture
def client_with_dist(tmp_path, monkeypatch):
    """Build a temporary frontend/dist scaffold and create an app pointed at it."""
    # The static-mount path in main.py is computed relative to backend/app/main.py
    # (../../frontend/dist). We rewrite os.path.realpath inside the test to point
    # at our tmp tree, but the simpler tactic is to chdir to a fake repo root where
    # frontend/dist is present.
    fake_root = tmp_path / "repo"
    backend_dir = fake_root / "backend" / "app"
    dist_dir = fake_root / "frontend" / "dist"
    assets_dir = dist_dir / "assets"
    backend_dir.mkdir(parents=True)
    assets_dir.mkdir(parents=True)
    (dist_dir / "index.html").write_text("<!doctype html><html>SPA</html>")
    (assets_dir / "index-abc.js").write_text("console.log('bundle')")
    (dist_dir / "favicon.ico").write_bytes(b"\x00\x00")

    # Monkeypatch the dirname-based path used in create_app() to resolve to our tree
    real_dirname = os.path.dirname

    def fake_dirname(p: str) -> str:
        if p.endswith("main.py"):
            return str(backend_dir)
        return real_dirname(p)

    monkeypatch.setattr(os.path, "dirname", fake_dirname)

    app = create_app()
    with TestClient(app) as c:
        yield c


def test_spa_fallback_serves_index_for_unknown_route(client_with_dist):
    """A hard refresh on /models must return index.html, not 404."""
    resp = client_with_dist.get("/models")
    assert resp.status_code == 200
    assert "SPA" in resp.text
    assert resp.headers["content-type"].startswith("text/html")


def test_spa_fallback_serves_index_for_nested_route(client_with_dist):
    resp = client_with_dist.get("/some/deep/nested/path")
    assert resp.status_code == 200
    assert "SPA" in resp.text


def test_spa_fallback_serves_real_files_when_present(client_with_dist):
    """favicon.ico and similar real files should be served as themselves, not as HTML."""
    resp = client_with_dist.get("/favicon.ico")
    assert resp.status_code == 200
    assert resp.content == b"\x00\x00"


def test_spa_fallback_does_not_swallow_unknown_api_paths(client_with_dist):
    """Unknown /api/... paths must 404, not return HTML — the SPA shouldn't shadow the API."""
    resp = client_with_dist.get("/api/does-not-exist")
    assert resp.status_code == 404
    # Crucially, the body should not be the SPA HTML
    assert "SPA" not in resp.text


def test_spa_fallback_blocks_path_traversal(client_with_dist):
    """A traversal attempt that resolves outside dist must not leak files —
    the fallback should return index.html, not the targeted file."""
    resp = client_with_dist.get("/../../../etc/passwd")
    # Either 200 with index.html, or 404 — anything but the actual file contents.
    assert resp.status_code in (200, 404)
    assert "root:" not in resp.text
