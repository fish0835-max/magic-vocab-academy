"""
EnglishCard 題庫自動填充後端

啟動方式:
  cd server
  pip install -r requirements.txt
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""
import re
import json
import uuid
import asyncio
import logging
from pathlib import Path
import httpx
import anthropic
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List

# ── Paths ──────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = BASE_DIR / "uploads"
CONFIG_FILE = DATA_DIR / "config.json"
WORDBANK_FILE = DATA_DIR / "wordbank.json"

DATA_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)


# ── Persistence helpers ────────────────────────────────────────────────────────

def load_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"pin": "0000"}

def save_config(d: dict) -> None:
    CONFIG_FILE.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")

def load_wordbank() -> list:
    if WORDBANK_FILE.exists():
        try:
            return json.loads(WORDBANK_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return []

def save_wordbank(w: list) -> None:
    WORDBANK_FILE.write_text(json.dumps(w, ensure_ascii=False, indent=2), encoding="utf-8")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="EnglishCard Fill API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images as static files
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

UA = "Mozilla/5.0 EnglishCardApp/1.0 (educational)"


# ── Models ────────────────────────────────────────────────────────────────────

class ScrapeRequest(BaseModel):
    word: str

class ClaudeRequest(BaseModel):
    word: str
    api_key: str

class FillResponse(BaseModel):
    translation: str
    imageUrl: str
    sentence: str          # first sentence (backward compat)
    sentences: list[str]   # all sentences found
    error: str = ""

class SaveWordBankRequest(BaseModel):
    words: list
    originalIds: Optional[List[str]] = None

class VerifyPinRequest(BaseModel):
    pin: str

class ChangePinRequest(BaseModel):
    newPin: str


# ── 1. Translation — Google Translate bidirectional dictionary ─────────────────

async def fetch_translation(word: str) -> str:
    """Google Translate dt=t (machine translation) → MyMemory fallback."""
    try:
        async with httpx.AsyncClient(timeout=8, headers={"User-Agent": UA}) as c:
            r = await c.get(
                "https://translate.googleapis.com/translate_a/single",
                params=[
                    ("client", "gtx"), ("sl", "en"), ("tl", "zh-TW"),
                    ("dt", "t"), ("q", word),
                ],
            )
            r.raise_for_status()
            data = r.json()
            result = (data[0][0][0] if data[0] and data[0][0] else "") or ""
            result = result.strip()
            if result and result.lower() != word.lower():
                logger.info(f"[trans] Google t: {word} → {result}")
                return result

    except Exception as e:
        logger.warning(f"[trans] Google t failed for '{word}': {e}")

    # Fallback: MyMemory
    try:
        async with httpx.AsyncClient(timeout=8) as c:
            r = await c.get(
                "https://api.mymemory.translated.net/get",
                params={"q": word, "langpair": "en|zh-TW"},
            )
            r.raise_for_status()
            result = r.json().get("responseData", {}).get("translatedText", "").strip()
            if result and result.lower() != word.lower():
                logger.info(f"[trans] MyMemory: {word} → {result}")
                return result
    except Exception as e:
        logger.warning(f"[trans] MyMemory failed for '{word}': {e}")

    return ""


# ── 2. Sentences — Google Translate examples (dt=ex) + Tatoeba fallback ───────

async def fetch_sentences_google(word: str, max_count: int = 5) -> list[str]:
    """
    Google Translate dt=ex returns example sentences showing the word in context.
    HTML bold tags (<b>word</b>) mark the target word — we strip them and replace
    the word itself with ___ .
    """
    try:
        async with httpx.AsyncClient(timeout=8, headers={"User-Agent": UA}) as c:
            r = await c.get(
                "https://translate.googleapis.com/translate_a/single",
                params=[
                    ("client", "gtx"), ("sl", "en"), ("tl", "zh-TW"),
                    ("dt", "t"), ("dt", "ex"), ("q", word),
                ],
            )
            r.raise_for_status()
            data = r.json()

            # dt=ex result is at index 5
            raw_examples = data[5] if len(data) > 5 and data[5] else []
            sentences: list[str] = []
            for ex in raw_examples[:max_count * 2]:
                # Each example: [html_sentence, ...]
                html = str(ex[0]) if ex else ""
                # Strip all HTML tags
                clean = re.sub(r"<[^>]+>", "", html).strip()
                # Replace the word (whole-word) with ___
                result = re.sub(
                    rf"\b{re.escape(word)}\b", "___", clean, flags=re.IGNORECASE
                )
                if "___" in result and len(result) > len(word) + 5:
                    sentences.append(result)
                if len(sentences) >= max_count:
                    break

            logger.info(f"[sentences] Google ex: {word} → {len(sentences)} sentences")
            return sentences

    except Exception as e:
        logger.warning(f"[sentences] Google ex failed for '{word}': {e}")
        return []


async def fetch_sentences_tatoeba(word: str, max_count: int = 5) -> list[str]:
    """
    Tatoeba.org free sentence corpus — English sentences, filtered by word.
    """
    try:
        async with httpx.AsyncClient(timeout=10, headers={"User-Agent": UA}) as c:
            r = await c.get(
                "https://tatoeba.org/api_v0/search",
                params={"from": "eng", "query": word, "limit": 20, "native": 1},
            )
            r.raise_for_status()
            results = r.json().get("results", [])
            sentences: list[str] = []
            for item in results:
                text = item.get("text", "")
                if re.search(rf"\b{re.escape(word)}\b", text, re.IGNORECASE):
                    s = re.sub(
                        rf"\b{re.escape(word)}\b", "___", text, flags=re.IGNORECASE
                    ).strip()
                    if "___" in s:
                        sentences.append(s)
                if len(sentences) >= max_count:
                    break
            logger.info(f"[sentences] Tatoeba: {word} → {len(sentences)} sentences")
            return sentences
    except Exception as e:
        logger.warning(f"[sentences] Tatoeba failed for '{word}': {e}")
        return []


async def fetch_sentences_dictionary(word: str) -> list[str]:
    """Free Dictionary API examples (limited but reliable for common words)."""
    try:
        async with httpx.AsyncClient(timeout=8, headers={"User-Agent": UA}) as c:
            r = await c.get(f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}")
            r.raise_for_status()
            data = r.json()
            if not isinstance(data, list):
                return []
            sentences: list[str] = []
            for entry in data:
                for meaning in entry.get("meanings", []):
                    for defn in meaning.get("definitions", []):
                        ex = defn.get("example", "")
                        if ex:
                            s = re.sub(
                                rf"\b{re.escape(word)}\b", "___", ex, flags=re.IGNORECASE
                            ).strip()
                            if "___" in s:
                                sentences.append(s)
            return sentences
    except Exception as e:
        logger.warning(f"[sentences] Dictionary failed for '{word}': {e}")
        return []


async def fetch_sentences(word: str) -> list[str]:
    """Aggregate sentences from multiple sources, deduplicate, return up to 5."""
    # Run all sources concurrently
    google_sents, tatoeba_sents, dict_sents = await asyncio.gather(
        fetch_sentences_google(word),
        fetch_sentences_tatoeba(word),
        fetch_sentences_dictionary(word),
    )
    seen: set[str] = set()
    merged: list[str] = []
    for s in [*google_sents, *tatoeba_sents, *dict_sents]:
        key = s.lower()
        if key not in seen:
            seen.add(key)
            merged.append(s)
        if len(merged) >= 5:
            break
    logger.info(f"[sentences] merged for '{word}': {len(merged)}")
    return merged


# ── 3. Image — Unsplash napi + Wikipedia REST fallback ───────────────────────

async def fetch_unsplash_image(word: str) -> str:
    """
    Unsplash unofficial search endpoint — no API key required.
    Returns the 'small' URL of the first relevant photo.
    """
    try:
        async with httpx.AsyncClient(
            timeout=8,
            headers={
                "User-Agent": UA,
                "Accept": "application/json",
                "Referer": "https://unsplash.com/",
            },
        ) as c:
            r = await c.get(
                "https://unsplash.com/napi/search/photos",
                params={"query": word, "per_page": 3, "orientation": "squarish"},
            )
            r.raise_for_status()
            results = r.json().get("results", [])
            if results:
                url = results[0]["urls"].get("small", "")
                logger.info(f"[image] Unsplash: {word} → {url[:60]}…")
                return url
    except Exception as e:
        logger.warning(f"[image] Unsplash failed for '{word}': {e}")
    return ""


async def fetch_wikipedia_image(word: str) -> str:
    """Wikipedia REST summary → thumbnail (fallback)."""
    try:
        async with httpx.AsyncClient(
            timeout=8, headers={"User-Agent": UA}, follow_redirects=True
        ) as c:
            r = await c.get(
                f"https://en.wikipedia.org/api/rest_v1/page/summary/{word}"
            )
            if r.status_code == 200:
                url = r.json().get("thumbnail", {}).get("source", "")
                if url:
                    logger.info(f"[image] Wikipedia REST: {word} → {url[:60]}…")
                    return url
    except Exception as e:
        logger.warning(f"[image] Wikipedia failed for '{word}': {e}")

    # Search fallback
    try:
        async with httpx.AsyncClient(timeout=10, headers={"User-Agent": UA}) as c:
            sr = await c.get(
                "https://en.wikipedia.org/w/api.php",
                params={"action": "query", "list": "search", "srsearch": word,
                        "srlimit": 3, "format": "json", "origin": "*"},
            )
            sr.raise_for_status()
            titles = [r["title"] for r in sr.json().get("query", {}).get("search", [])]
            if not titles:
                return ""
            pr = await c.get(
                "https://en.wikipedia.org/w/api.php",
                params={"action": "query", "titles": "|".join(titles[:3]),
                        "prop": "pageimages", "pithumbsize": 300,
                        "format": "json", "redirects": 1},
            )
            pr.raise_for_status()
            for page in pr.json().get("query", {}).get("pages", {}).values():
                url = page.get("thumbnail", {}).get("source", "")
                if url:
                    logger.info(f"[image] Wikipedia search: {word} → {url[:60]}…")
                    return url
    except Exception as e:
        logger.warning(f"[image] Wikipedia search failed for '{word}': {e}")
    return ""


async def fetch_image_url(word: str) -> str:
    url = await fetch_unsplash_image(word)
    if not url:
        url = await fetch_wikipedia_image(word)
    return url


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/api/fill/scrape", response_model=FillResponse)
async def fill_by_scrape(req: ScrapeRequest):
    """
    並發查詢:
    - 翻譯: Google Translate bidirectional dictionary (dt=bd)
    - 例句: Google Translate examples (dt=ex) + Tatoeba + Free Dictionary
    - 圖片: Unsplash napi → Wikipedia REST fallback
    """
    word = req.word.strip()
    logger.info(f"[scrape] '{word}'")

    translation, sentences, image_url = await asyncio.gather(
        fetch_translation(word),
        fetch_sentences(word),
        fetch_image_url(word),
    )

    logger.info(
        f"[scrape] done '{word}': trans={repr(translation)}, "
        f"img={bool(image_url)}, sentences={len(sentences)}"
    )
    return FillResponse(
        translation=translation,
        imageUrl=image_url,
        sentence=sentences[0] if sentences else "",
        sentences=sentences,
    )


@app.post("/api/fill/claude", response_model=FillResponse)
async def fill_by_claude(req: ClaudeRequest):
    """Claude Haiku — generates translation, image URL, and multiple example sentences."""
    word = req.word.strip()
    logger.info(f"[claude] '{word}'")

    try:
        client = anthropic.AsyncAnthropic(api_key=req.api_key)
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            messages=[{
                "role": "user",
                "content": (
                    f'You are building an English vocabulary app for elementary school students in Taiwan.\n'
                    f'For the English word "{word}", provide:\n'
                    f'1. "translation": Traditional Chinese (繁體中文), the word only\n'
                    f'2. "imageUrl": Direct public image URL ending in .jpg or .png '
                    f'(prefer upload.wikimedia.org or similar stable CDN)\n'
                    f'3. "sentences": JSON array of 3 simple English sentences (grade 1-3 level), '
                    f'each replacing "{word}" with exactly ___ (three underscores)\n\n'
                    f'Output ONLY valid JSON, no markdown:\n'
                    f'{{"translation":"...","imageUrl":"...","sentences":["...","...","..."]}}'
                ),
            }],
        )
        text = message.content[0].text.strip()
        logger.info(f"[claude] raw: {text[:300]}")

        start, end = text.find("{"), text.rfind("}") + 1
        if start == -1:
            raise ValueError(f"No JSON in response: {text}")
        data = json.loads(text[start:end])

        sentences = data.get("sentences", [])
        if not isinstance(sentences, list):
            sentences = [sentences] if sentences else []
        # Legacy sentence field
        single = data.get("sentence", "")
        if single and single not in sentences:
            sentences.insert(0, single)

        return FillResponse(
            translation=data.get("translation", ""),
            imageUrl=data.get("imageUrl", ""),
            sentence=sentences[0] if sentences else "",
            sentences=sentences,
        )

    except anthropic.AuthenticationError:
        msg = "API Key 無效，請在設定中重新輸入正確的 Anthropic API Key"
        logger.error(f"[claude] auth error for '{word}'")
        return FillResponse(translation="", imageUrl="", sentence="", sentences=[], error=msg)
    except Exception as e:
        msg = str(e)
        logger.error(f"[claude] error for '{word}': {msg}")
        return FillResponse(translation="", imageUrl="", sentence="", sentences=[], error=msg)


# ── Word bank endpoints ────────────────────────────────────────────────────────

@app.get("/api/wordbank")
async def get_wordbank():
    return load_wordbank()


@app.post("/api/wordbank")
async def save_wordbank_endpoint(req: SaveWordBankRequest):
    if req.originalIds is not None:
        # Edit session: remove old entries and replace with new ones
        existing = load_wordbank()
        id_set = set(req.originalIds)
        kept = [w for w in existing if w.get("id") not in id_set]
        save_wordbank(kept + list(req.words))
    else:
        # Upsert: replace by ID if exists, otherwise append
        existing = load_wordbank()
        existing_map = {w.get("id"): i for i, w in enumerate(existing)}
        result = list(existing)
        for word in req.words:
            wid = word.get("id") if isinstance(word, dict) else None
            if wid and wid in existing_map:
                result[existing_map[wid]] = word
            else:
                result.append(word)
        save_wordbank(result)
    return {"ok": True}


@app.delete("/api/wordbank")
async def clear_wordbank():
    save_wordbank([])
    return {"ok": True}


# ── Auth endpoints ─────────────────────────────────────────────────────────────

@app.post("/api/auth/verify")
async def verify_pin(req: VerifyPinRequest):
    config = load_config()
    ok = req.pin.upper() == config.get("pin", "0000").upper()
    return {"ok": ok}


@app.post("/api/auth/change-pin")
async def change_pin(req: ChangePinRequest):
    if not re.match(r'^[A-Za-z0-9]{4}$', req.newPin):
        raise HTTPException(status_code=400, detail="PIN must be 4 alphanumeric characters")
    config = load_config()
    config["pin"] = req.newPin.upper()
    save_config(config)
    return {"ok": True}


# ── Image upload endpoint ──────────────────────────────────────────────────────

@app.post("/api/upload/image")
async def upload_image(file: UploadFile = File(...)):
    ext = Path(file.filename or "image.jpg").suffix.lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOADS_DIR / filename
    content = await file.read()
    dest.write_bytes(content)
    return {"url": f"/uploads/{filename}"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}
