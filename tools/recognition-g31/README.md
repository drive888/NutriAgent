# G31 recognition engine

Select **G31** under **Recognition engine** in Foods → camera, or in the food editor’s **Recognize this photo** dialog. G31 supports meal photos; nutrition-label OCR uses the standard engine. Switching engines clears the previous review. No automatic fallback or food/diary writes occur.

## Run locally

From the project root (Python 3.12 recommended):

```sh
python3 -m venv .venv
.venv/bin/pip install -r tools/recognition-g31/requirements.txt
DEVICE=cpu .venv/bin/python -m uvicorn app:app --app-dir tools/recognition-g31 --host 127.0.0.1 --port 3213
```

Set the Express server’s `G31_RECOGNITION_URL=http://127.0.0.1:3213/predict`. For the local Docker preview, use `http://host.docker.internal:3213/predict` and a host reachable from the container. The current Mac setup uses the isolated `../NutriAgent-local/g31-venv` environment. Model startup and inference run on CPU, with two Torch threads by default (`TORCH_NUM_THREADS`). Dependencies and model artifacts are local; inference does not call a cloud API.

```sh
curl http://localhost:3213/health
curl -F image=@tools/recognition-g31/samples/pizza.jpg http://localhost:3213/predict
```

The Node adapter posts multipart field `image`. The Python service returns three calibrated Food-101 labels/confidences. The authenticated Express endpoints are `GET /api/recognition/engines` and `POST /api/recognition/meal` with `{ "engine": "g31", "image": "data:image/jpeg;base64,..." }`. Existing clients without an engine continue using `legacy`.

## Adding another engine

Add a server environment entry; the selector reads the registry, so no UI edits are necessary:

```dotenv
RECOGNITION_ENGINES_JSON=[{"id":"another-model","name":"Another model","nameZh":"另一识别引擎","kinds":["meal"],"adapter":"json","url":"http://model:8000/recognize"}]
```

`json` providers accept `{kind,image}` and return the existing `candidates` or label-nutrient contract. `g31` providers accept multipart `image` and return `predictions:[{label,confidence}]`. For a different wire format, add an adapter in `server/lib/recognition-service.js`; register its capabilities in `recognition-engines.js`. Provider URLs and optional tokens are configured on the server and never returned by engine listing. Unconfigured engines are disabled; unsupported engine/type combinations are rejected server-side.

## Source and limits

Selectively imported from the user-provided `g31-prototype-handoff(1).zip`: model service, 101-class checkpoint, calibration, pizza sample and approximate nutrition seed. The rest of the old application was not copied. Changes to the service: NutriAgent title, `weights_only=True` loading, 6 MiB upload cap and configurable CPU thread limit. No MongoDB or additional persistence is required.

Checkpoint SHA256: `4d55b36dc23d51cf1446a678534c75662d202e728153755c086f887e226e79c1`.

The supplied nutrition table has 47 classes, marked `demo_seed`. It contains approximate per-100g averages and small/medium/large reference weights. These are **not photo-measured portions or verified nutrition**. Users choose a reference weight or enter grams, review the estimates and explicitly confirm. Missing entries/nutrients remain unknown. A successful pizza smoke test proves the integration, not independent accuracy or mixed-meal capability.

References: [PyTorch weights-only loading](https://docs.pytorch.org/docs/stable/generated/torch.load.html), [FastAPI multipart uploads](https://fastapi.tiangolo.com/tutorial/request-files/).
