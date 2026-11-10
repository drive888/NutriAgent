# Local baseline adapter

Food101 source: https://huggingface.co/onnx-community/swin-finetuned-food101-ONNX
Use `onnx/model_quantized.onnx` saved as model.onnx, plus config.json and preprocessor_config.json. Set FOOD_MODEL_DIR to that directory. Python dependencies: onnxruntime,numpy,Pillow (isolated environment recommended). Set FOOD_PYTHON to that interpreter. OCR requires macOS and Xcode command-line tools.

```sh
swiftc tools/recognition-macos/vision.swift -o /tmp/nt-vision
FOOD_PYTHON=/path/to/python FOOD_MODEL_DIR=/path/to/model VISION_PORT=3212 node tools/recognition-macos/service.mjs
```

Native OCR languages: English,Simplified Chinese,French,German. Parser is conservative and incomplete; unclear bases and missing units cannot become verified nutritional data. Images are deleted after each request. Default loopback only, no CORS. Optional VISION_TOKEN authenticates the internal adapter; configure matching RECOGNITION_TOKEN on application server. Do not expose an unauthenticated inference service publicly.

Food101 probabilities are actual softmax outputs, not calibrated likelihoods. Out-of-distribution food may still map incorrectly. Canonical10-class mapping and confidence threshold are a baseline, not validated canteen performance. Unknown output is allowed. This Mac-specific OCR adapter is replaceable via the documented HTTP contract and does not replace required team deliverables or independent data collection.
