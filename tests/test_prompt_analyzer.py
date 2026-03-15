from backend.services.prompt_analyzer import tokenize_prompt, analyze_tokens


def test_basic_comma_split():
    tokens = tokenize_prompt("a beautiful landscape, sunset, mountains")
    assert "beautiful landscape" in tokens
    assert "sunset" in tokens
    assert "mountains" in tokens


def test_removes_stopwords():
    tokens = tokenize_prompt("a the of in with on")
    assert len(tokens) == 0


def test_removes_short_tokens():
    tokens = tokenize_prompt("a, an, ok, cat, dog")
    assert "cat" in tokens
    assert "dog" in tokens
    assert "a" not in tokens
    assert "an" not in tokens
    assert "ok" not in tokens


def test_handles_weight_syntax():
    tokens = tokenize_prompt("(masterpiece:1.4), (best quality:1.2), landscape")
    assert "masterpiece" in tokens
    assert "best quality" in tokens
    assert "landscape" in tokens


def test_handles_break_tokens():
    tokens = tokenize_prompt("landscape, BREAK, mountains, BREAK, sky")
    assert "BREAK" not in tokens
    assert "landscape" in tokens
    assert "mountains" in tokens


def test_deduplication():
    tokens = tokenize_prompt("cat, cat, dog, cat")
    assert tokens.count("cat") == 1
    assert tokens.count("dog") == 1


def test_lowercases():
    tokens = tokenize_prompt("Beautiful Landscape, SUNSET")
    assert "beautiful landscape" in tokens
    assert "sunset" in tokens


def test_empty_prompt():
    assert tokenize_prompt("") == []
    assert tokenize_prompt(None) == []


def test_analyze_tokens_counts():
    prompts = ["cat, dog, bird", "cat, fish", "cat, dog"]
    result = analyze_tokens(prompts)
    token_map = {r["token"]: r["count"] for r in result}
    assert token_map["cat"] == 3
    assert token_map["dog"] == 2
    assert token_map["fish"] == 1
    assert token_map["bird"] == 1


def test_analyze_tokens_limit():
    prompts = ["cat, dog, bird, fish, horse"]
    result = analyze_tokens(prompts, limit=3)
    assert len(result) == 3
