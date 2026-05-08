from datetime import datetime, date
from backend.app.models import Generation, GenerationLora, Model
from backend.services.analytics import (
    get_overview_stats, get_top_models, get_least_used_models,
    get_family_distribution, get_model_leaderboard,
    get_resolution_distribution, get_scheduler_distribution,
    get_steps_distribution, get_cfg_distribution,
    get_lora_stats, get_error_stats, get_volume_trend,
    get_activity_heatmap, get_parameter_trends,
    get_prompt_top_tokens, get_prompt_length_distribution,
    get_unused_models,
)


def test_overview_stats(seeded_db):
    result = get_overview_stats(seeded_db)
    assert result["total_images"] == 8
    assert result["models_used"] == 4
    assert result["top_model"] == "Juggernaut XL v9"

def test_overview_stats_filtered_by_user(seeded_db):
    result = get_overview_stats(seeded_db, user_id="user-2")
    assert result["total_images"] == 3

def test_overview_stats_filtered_by_date(seeded_db):
    result = get_overview_stats(seeded_db, start_date=date(2026, 2, 1), end_date=date(2026, 2, 28))
    assert result["total_images"] == 4

def test_top_models(seeded_db):
    result = get_top_models(seeded_db, limit=3)
    assert len(result) == 3
    assert result[0]["model_name"] == "Juggernaut XL v9"
    assert result[0]["count"] == 3

def test_least_used_models(seeded_db):
    result = get_least_used_models(seeded_db, limit=2)
    assert len(result) == 2
    names = [r["model_name"] for r in result]
    assert "perfectdeliberate_v70" in names
    assert "Z-Image Turbo" in names

def test_family_distribution(seeded_db):
    result = get_family_distribution(seeded_db)
    fam_map = {r["model_base"]: r["count"] for r in result}
    assert fam_map["sdxl"] == 4
    assert fam_map["flux"] == 3
    assert fam_map["z-image"] == 1

def test_model_leaderboard(seeded_db):
    result = get_model_leaderboard(seeded_db)
    assert len(result) == 4
    jugger = next(r for r in result if r["model_name"] == "Juggernaut XL v9")
    assert jugger["count"] == 3
    assert jugger["model_base"] == "sdxl"

def test_resolution_distribution(seeded_db):
    result = get_resolution_distribution(seeded_db)
    res_map = {r["resolution"]: r["count"] for r in result}
    assert res_map["1024x1024"] == 5

def test_scheduler_distribution(seeded_db):
    result = get_scheduler_distribution(seeded_db)
    sched_map = {r["scheduler"]: r["count"] for r in result}
    assert "euler" in sched_map
    assert "dpmpp_3m_k" in sched_map

def test_lora_stats(seeded_db):
    result = get_lora_stats(seeded_db)
    assert result["total_with_lora"] == 2
    assert result["pct_with_lora"] == 25.0
    lora_map = {r["lora_name"]: r["count"] for r in result["top_loras"]}
    assert lora_map["JuggerCineXL2"] == 2
    assert lora_map["DetailTweaker"] == 1

def test_error_stats(seeded_db):
    result = get_error_stats(seeded_db)
    assert result["total_failed"] == 1
    assert result["total_items"] == 3
    assert len(result["by_error_type"]) == 1
    assert result["by_error_type"][0]["error_type"] == "ModelNotFound"

def test_volume_trend(seeded_db):
    result = get_volume_trend(seeded_db, granularity="month")
    assert len(result) >= 2

def test_prompt_top_tokens(seeded_db):
    result = get_prompt_top_tokens(seeded_db, limit=5)
    token_map = {r["token"]: r["count"] for r in result}
    assert token_map["cat"] == 3

def test_prompt_length_distribution(seeded_db):
    result = get_prompt_length_distribution(seeded_db)
    assert len(result) > 0
    assert all("bucket" in r and "count" in r for r in result)


def _seed_unused_fixture(db):
    """Two used + two unused mains, two used + two unused loras, plus an embedding."""
    db.add(Generation(image_name="u-001", user_id="u", created_at=datetime(2026, 1, 1),
                      model_name="UsedMain", model_base="sdxl", model_key="key-used-main"))
    db.add(Generation(image_name="u-002", user_id="u", created_at=datetime(2026, 1, 2),
                      model_name="UsedMain2", model_base="flux", model_key="key-used-main-2"))
    db.flush()
    g1 = db.query(Generation).filter_by(image_name="u-001").first()
    db.add(GenerationLora(generation_id=g1.id, lora_name="UsedLora", lora_weight=0.5))
    db.add(GenerationLora(generation_id=g1.id, lora_name="UsedLora2", lora_weight=0.5))

    rows = [
        Model(key="key-used-main", name="UsedMain", base="sdxl", type="main", file_size=100),
        Model(key="key-used-main-2", name="UsedMain2", base="flux", type="main", file_size=200),
        Model(key="key-unused-main", name="UnusedMain", base="sdxl", type="main", file_size=300),
        Model(key="key-unused-main-2", name="LonelyFluxModel", base="flux", type="main", file_size=400),
        # LoRAs match by name, not key
        Model(key="lora-1", name="UsedLora", base="sdxl", type="lora", file_size=10),
        Model(key="lora-2", name="UsedLora2", base="sdxl", type="lora", file_size=20),
        Model(key="lora-3", name="UnusedLora", base="sdxl", type="lora", file_size=30),
        Model(key="lora-4", name="UnusedFluxLora", base="flux", type="lora", file_size=40),
        # Non-main/lora types are always unused (no usage tracked)
        Model(key="emb-1", name="SomeEmbedding", base="sdxl", type="embedding", file_size=5),
    ]
    for m in rows:
        db.add(m)
    db.commit()


def test_unused_models_default_returns_all_unused_types(db_session):
    _seed_unused_fixture(db_session)
    result = get_unused_models(db_session)
    names = sorted(r["name"] for r in result)
    assert names == ["LonelyFluxModel", "SomeEmbedding", "UnusedFluxLora", "UnusedLora", "UnusedMain"]


def test_unused_models_filter_by_type_main(db_session):
    _seed_unused_fixture(db_session)
    result = get_unused_models(db_session, model_type="main")
    names = sorted(r["name"] for r in result)
    assert names == ["LonelyFluxModel", "UnusedMain"]


def test_unused_models_filter_by_type_lora(db_session):
    _seed_unused_fixture(db_session)
    result = get_unused_models(db_session, model_type="lora")
    names = sorted(r["name"] for r in result)
    assert names == ["UnusedFluxLora", "UnusedLora"]


def test_unused_models_search_is_case_insensitive_substring(db_session):
    _seed_unused_fixture(db_session)
    result = get_unused_models(db_session, search="flux")
    names = sorted(r["name"] for r in result)
    assert names == ["LonelyFluxModel", "UnusedFluxLora"]


def test_unused_models_payload_shape(db_session):
    _seed_unused_fixture(db_session)
    result = get_unused_models(db_session, model_type="main", search="UnusedMain")
    assert len(result) == 1
    row = result[0]
    assert set(row.keys()) == {
        "key", "name", "base", "type", "format", "file_size", "description", "source",
    }
    assert row["name"] == "UnusedMain"
    assert row["file_size"] == 300


def test_unused_models_empty_when_registry_empty(db_session):
    """No models snapshotted yet (e.g., before first sync)."""
    result = get_unused_models(db_session)
    assert result == []
