import re
from collections import Counter
from typing import Optional

STOPWORDS = {
    "a", "an", "the", "of", "in", "on", "at", "to", "for", "is", "it",
    "and", "or", "but", "with", "by", "from", "as", "be", "was", "were",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "shall", "can", "this",
    "that", "these", "those", "i", "you", "he", "she", "we", "they",
    "me", "him", "her", "us", "them", "my", "your", "his", "its", "our",
    "their", "not", "no", "so", "if", "up", "out", "just", "about",
    "into", "over", "after", "very",
}

CONTROL_TOKENS = {"BREAK", "break"}

WEIGHT_PATTERN = re.compile(r"\(([^:]+):\s*[\d.]+\)")


def tokenize_prompt(prompt: Optional[str]) -> list[str]:
    if not prompt:
        return []
    prompt = WEIGHT_PATTERN.sub(r"\1", prompt)
    segments = prompt.split(",")
    seen = set()
    tokens = []
    for segment in segments:
        token = segment.strip().lower()
        if not token:
            continue
        if token.upper() in CONTROL_TOKENS:
            continue
        # Strip stopword-only words from both ends of multi-word tokens
        words = token.split()
        while words and words[0] in STOPWORDS:
            words.pop(0)
        while words and words[-1] in STOPWORDS:
            words.pop()
        token = " ".join(words)
        if not token:
            continue
        if token in STOPWORDS:
            continue
        if len(token) <= 2:
            continue
        if token not in seen:
            seen.add(token)
            tokens.append(token)
    return tokens


def analyze_tokens(prompts: list[str], limit: int = 0) -> list[dict[str, int]]:
    counter: Counter = Counter()
    for prompt in prompts:
        tokens = tokenize_prompt(prompt)
        counter.update(tokens)
    items = counter.most_common(limit if limit > 0 else None)
    return [{"token": token, "count": count} for token, count in items]
