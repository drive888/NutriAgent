"""Food-recognition service for the NutriAgent prototype (Sprint 1 slice).

`POST /predict` answers exactly one question — *which Food-101 dish is this?* —
and returns the top-3 labels with temperature-calibrated confidence. Portions,
calories and diary writes stay on the Express side (`server/routes/scan.js`), so
the responsibility split from `docs/api-contract.md` §0 is preserved: this
service never touches users, nutrition tables or the database.

Run (from the repo root):

    python -m uvicorn app:app --app-dir ml-service --port 8000

Environment:
    MODEL_PATH        default ml/runs/b0_101cls_long/best.pt
    CALIBRATION_PATH  default ml/runs/b0_101cls_long/calibration.json
    DEVICE            cuda | cpu (default: cuda when available)
    ML_PORT           only used by `python ml-service/app.py`
"""

from __future__ import annotations

import io
import json
import os
import sys
import time
from pathlib import Path
from threading import Lock

# The prototype keeps its Python wheels beside the code (`pip install --target
# ml-service/.deps`), so a fresh checkout runs without touching the global
# environment. Absent that folder, a normal `pip install fastapi uvicorn
# python-multipart` works too.
_HERE = Path(__file__).resolve().parent
_DEPS = _HERE / ".deps"
if _DEPS.is_dir() and str(_DEPS) not in sys.path:
    sys.path.insert(0, str(_DEPS))

import torch
import torch.nn as nn
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps
from torchvision import transforms
from torchvision.models import convnext_tiny, efficientnet_b0

ROOT = _HERE.parent


def _resolve(env_name: str, *candidates: Path) -> Path:
    """Env var wins; otherwise the first existing candidate.

    The training artefacts live in `<repo>/ml/runs/...` when `ml/` is inside
    this repo, but in this team's layout `ml/` sits beside `nutritrace-main/`,
    so both are checked before falling back to the first candidate.
    """
    override = os.environ.get(env_name)
    if override:
        return Path(override)
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return candidates[0]


MODEL_PATH = _resolve(
    "MODEL_PATH",
    # self-contained handoff bundle layout: <bundle>/weights/best-101cls.pt
    _HERE / "weights" / "best-101cls.pt",
    _HERE / "weights" / "best-255cls.pt",
    ROOT / "ml" / "runs" / "b0_101cls_long" / "best.pt",
    ROOT.parent / "ml" / "runs" / "b0_101cls_long" / "best.pt",
)
CALIBRATION_PATH = _resolve(
    "CALIBRATION_PATH",
    _HERE / "config" / "calibration-101cls.json",
    _HERE / "config" / "calibration-255cls.json",
    ROOT / "ml" / "runs" / "b0_101cls_long" / "calibration.json",
    ROOT.parent / "ml" / "runs" / "b0_101cls_long" / "calibration.json",
)
MODEL_VERSION = "efficientnet-b0-food101-101cls-v2"
TOP_K = 3
MAX_BYTES = 6 * 1024 * 1024
IMG_SIZE = 224

app = FastAPI(title="NutriAgent food recognition", version="0.1.0")

# ── Model state ────────────────────────────────────────────────────────────
# Loaded once at import. A missing/broken checkpoint must not crash the
# process: the endpoint answers 503 so the Express side can degrade the same
# way it does when this service is down.
_model: nn.Module | None = None
_classes: list[str] = []
_temperature: float = 1.0
_device = torch.device(os.environ.get("DEVICE") or ("cuda" if torch.cuda.is_available() else "cpu"))
_load_error: str | None = None
_infer_lock = Lock()
torch.set_num_threads(int(os.environ.get("TORCH_NUM_THREADS", "2")))


def _build_model(num_classes: int, backbone: str = "efficientnet_b0") -> nn.Module:
    """Rebuild the training architecture (weights come from the checkpoint).

    Supported: efficientnet_b0 (Food-101 baseline) and convnext_tiny (the
    merged 255-class model).  ``weights=None`` because state comes from the
    checkpoint, which also carries the class list.
    """
    if backbone == "convnext_tiny":
        model = convnext_tiny(weights=None)
        head = model.classifier          # Sequential(LayerNorm2d, Flatten, Linear)
        model.classifier = nn.Sequential(
            head[0], head[1], nn.Linear(head[2].in_features, num_classes)
        )
        return model
    if backbone == "efficientnet_b0":
        model = efficientnet_b0(weights=None)
        in_features = model.classifier[1].in_features
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.2, inplace=True), nn.Linear(in_features, num_classes)
        )
        return model
    raise ValueError(f"unsupported backbone {backbone!r}")


def _load() -> None:
    global _model, _classes, _temperature, _load_error, MODEL_VERSION, IMG_SIZE, _transform
    try:
        ckpt = torch.load(MODEL_PATH, map_location="cpu", weights_only=True)
        classes = [str(c) for c in ckpt["classes"]]
        state = ckpt.get("model") or ckpt.get("model_state_dict") or ckpt.get("ema")
        if state is None:
            raise ValueError(f"checkpoint has no weights: {MODEL_PATH}")

        cfg = ckpt.get("config") or {}
        backbone = cfg.get("backbone") or "efficientnet_b0"
        model = _build_model(len(classes), backbone)
        model.load_state_dict(state)      # raises on class-count mismatch
        model.to(_device).eval()

        _model, _classes = model, classes
        IMG_SIZE = int(ckpt.get("img_size") or cfg.get("img_size") or IMG_SIZE)
        _transform = _make_transform(IMG_SIZE)
        MODEL_VERSION = os.environ.get("MODEL_VERSION") or (
            "convnext-t-foodmix-255cls-v1" if backbone == "convnext_tiny"
            else "efficientnet-b0-food101-101cls-v2"
        )
        if CALIBRATION_PATH.is_file():
            _temperature = float(json.loads(CALIBRATION_PATH.read_text(encoding="utf-8"))["temperature"])
        print(f"[ml] loaded {MODEL_VERSION} on {_device} | backbone={backbone} "
              f"classes={len(classes)} img={IMG_SIZE} | T={_temperature:.4f}")
    except Exception as exc:  # noqa: BLE001 — surface the reason on /health
        _load_error = f"{type(exc).__name__}: {exc}"
        print(f"[ml] WARNING: model not loaded — {_load_error}", file=sys.stderr)


def _make_transform(img_size: int) -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.Resize(int(img_size * 256 / 224), antialias=True),
            transforms.CenterCrop(img_size),
            transforms.ToTensor(),
            transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225)),
        ]
    )


_transform = _make_transform(IMG_SIZE)
_load()


def _read_image(raw: bytes) -> Image.Image:
    with Image.open(io.BytesIO(raw)) as im:
        im = ImageOps.exif_transpose(im)
        return im.convert("RGB")


def _pretty(label: str) -> str:
    return label.replace("_", " ")


@app.get("/health")
def health() -> JSONResponse:
    ok = _model is not None
    return JSONResponse(
        {
            "ok": ok,
            "model_version": MODEL_VERSION,
            "classes": len(_classes),
            "temperature": _temperature,
            "device": str(_device),
            "error": _load_error,
        },
        status_code=200 if ok else 503,
    )


@app.post("/predict")
def predict(image: UploadFile = File(...)) -> JSONResponse:
    if _model is None:
        return JSONResponse({"error": "MODEL_UNAVAILABLE", "detail": _load_error}, status_code=503)

    raw = image.file.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        return JSONResponse({"error": "IMAGE_TOO_LARGE"}, status_code=413)
    try:
        img = _read_image(raw)
    except Exception:  # noqa: BLE001 — any decoder failure is the caller's input
        return JSONResponse({"error": "INVALID_IMAGE"}, status_code=422)

    started = time.perf_counter()
    with _infer_lock, torch.inference_mode():
        logits = _model(_transform(img).unsqueeze(0).to(_device))
        # Temperature scaling fitted on val (calibration.json). T < 1 sharpens,
        # which is what the fitted value does here; never hard-code it.
        probs = torch.softmax(logits.float() / _temperature, dim=1)[0]
        top_p, top_i = torch.topk(probs, k=min(TOP_K, len(_classes)))
    latency_ms = (time.perf_counter() - started) * 1000

    predictions = [
        {"label": _classes[int(i)], "display_label": _pretty(_classes[int(i)]), "confidence": round(float(p), 4)}
        for p, i in zip(top_p, top_i)
    ]
    return JSONResponse(
        {
            "predictions": predictions,
            "model_version": MODEL_VERSION,
            "calibration": {"temperature": _temperature, "applied": _temperature != 1.0},
            "device": str(_device),
            "latency_ms": round(latency_ms, 1),
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("ML_PORT", "8000")))
