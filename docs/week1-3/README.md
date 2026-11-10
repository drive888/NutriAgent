# Weeks 1 to 3 implementation and verification

Localization is stopped. Existing localization changes are preserved.

## Environments

- Existing user instance: http://localhost:3101 (not replaced or restarted; existing data untouched).
- Isolated mock acceptance instance: http://localhost:3102.
- Isolated real inference acceptance instance: http://localhost:3103.
- Real host adapter: localhost:3212/recognize; Food101 ONNX meal model and Apple Vision OCR. Mac-specific OCR is a replaceable baseline, not the team's final model.

## Data relationships

Users own foods and diaries. Foods store nutrient amounts per `portion` and `unit`; diary `quantity` multiplies those amounts (not blindly per100g). Diaries are keyed by user and calendar date, with meal index on items; UUID merge and tombstones prevent retry duplicates and deleted-item resurrection. Recognition requests are transient drafts, never database writes. Confirmed label drafts are scaled to the selected portion, passed into the existing editor, then saved explicitly. Unknown nutrient values are omitted/null; existing upstream totals visually treat missing fields as zero and do not yet display a completeness warning.

## Recognition HTTP contract

Authenticated `POST /api/recognition/meal` or `/label`, JSON `{ "image": "data:image/jpeg;base64,..." }`. Cookie clients must send existing `X-CSRF-Token`; native bearer is supported. PNG/JPEG/WebP, max8MiB encoded (UI file max6MiB);20 requests/minute/user. No permanent image upload; local adapter deletes its temporary file in finally. Existing `/api/upload` supports authenticated multipart upload <=10MiB and rejects invalid magic bytes, but successful images are publicly readable under unguessable URLs by upstream design. Do not upload private/medical images to public deployments without completing owner-bound access and cleanup policy.

Provider request: POST configured URL with `{kind,image}`, optional `Authorization: Bearer` from server-only `RECOGNITION_TOKEN`. 30-second timeout. Meal response `{candidates:[{name,category,confidence?}]}`; optional confidence must be model-provided0..1. Supported categories: rice,noodles,bread,egg,chicken,beef,fish,vegetables,fruit,milk. Empty candidates means unknown. Label response `{name,basis,serving?,nutrients:{energy:{value,unit},proteins,fat,carbohydrates,sodium}}`; nutrients may be null. Basis per100g/per100ml/perServing; perServing requires positive serving amount and g/ml. kJ divided by4.184;g↔mg conversion; percentages rejected; cross mass-volume conversion without density rejected.

Env: MEAL_RECOGNITION_URL, LABEL_RECOGNITION_URL, RECOGNITION_TOKEN. Only RECOGNITION_MODE=mock returns mocks, clearly flagged. Default without service returns503; malformed provider result502;timeout504;invalid image415;rate429.

## Run real baseline on this Mac

```sh
swiftc tools/recognition-macos/vision.swift -o /tmp/nt-vision
# Dependencies installed separately to avoid touching the application environment:
# bundled python -m pip install --target /tmp/nt-model-deps onnxruntime
# model/config/preprocessor in /tmp/nt-food-model, source recorded below.
FOOD_PYTHON=/Users/leo/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
PYTHONPATH=/tmp/nt-model-deps VISION_PORT=3212 node tools/recognition-macos/service.mjs
```

Mac local adapter accepts loopback only by default. Docker on this Mac reaches it through host.docker.internal. For other hosts use a private authenticated service network; never bind publicly without `VISION_TOKEN` and firewall. Model source: https://huggingface.co/onnx-community/swin-finetuned-food101-ONNX (quantized ONNX, aspIs/swin-finetuned-food101). Dependency and weights currently in /tmp are not durable deployment artifacts. Pin model revision/checksum and package dependencies before production rollout. Each request starts model subprocess; suitable for coursework baseline, not throughput optimization.

## Evidence and limits

`evidence/unit-tests.log`, `integration.json`, `full-suite-isolated.log`, `food101-evaluation.json`, `ocr-comparison.json` and real browser screenshots are test evidence, not invented screenshots.

21 actual Food101 validation images, labels from published metadata, raw source URLs and hashes recorded. Resize and center-crop both21/21 top1 on this exploratory sample. Public benchmark may overlap pretrained training/evaluation history; NOT independent accuracy or canteen generalization. No task-specific training performed. Native generic Apple Vision classification was also measured and often returned tableware; replaced meal baseline with food-specialized ONNX. OCR one manually checked real nutrition-table image improved from no explicit basis/fields to per100g and539kcal,6.3g protein,57.5g carbs. Fat left unknown due unreliable unit reading; sodium not printed remains unknown. Another OFF "nutrition_en" URL actually contained a front-of-package photo; kept as negative evidence, never mislabeled as a real nutrition table.

Still required to accept all of the plan: balanced8–10-class canteen photos across conditions; independently acquired development/test originals with no variant leakage; diverse manually checked label gold data (per100ml/perServing/rotation/reflection/blur); representative before-after metrics; owner-bound permanent file access/retention policy; mobile-device camera acceptance; complete nutrient-completeness display. Actual3101 deployment pending a maintenance/restart decision; no claim of complete three-week acceptance.

Additional source-labelled 8-class subset: `samples/balanced/manifest.json` contains one development and one test original each for rice,noodles,bread,egg,chicken,beef,fish,vegetables. 16 originals; verify SHA256 separation in `evidence/balanced-evaluation.json`. Held-out8 tests: resize6/8,center6/8. Labels inherited from source, not double-annotated canteen data. Public model historical exposure caveat still applies; 6/8 is not a reliable population accuracy estimate. Initial21 images overlap some later selection and are exploratory only, not combined into a single independent test score.
