# User meal photo retest 2026-10-30

User explicitly requested replacing the old meal test with their supplied photo and correcting the report title. No application source changes made in this retest. Original3101 untouched. Test data created only in isolated3103.

Real ONNX model top1: bibimbap0.552045; top2: chicken_curry0.158830. Current category adapter drops bibimbap and exposes chicken0.158830. Browser recognition elapsed2114ms; separate authenticated API call2185ms. Inference executes successfully but semantic recognition acceptance FAILS for a multi-food meal.

Browser: original photo upload/preview -> real service recognition -> manually correct name -> confirm draft -> editor -> explicit save -> food library readback -> add1 lunch serving -> reload. Authenticated API readback confirms exactly1 diary entry. Screenshot evidence01-08. 100g is ONLY an arbitrary software test input, not measured from the photo. Nutrition is {} and remains unknown. Existing UI shows0kcal; this is a deficiency, not ground truth.

Also observed: corrected name retains category chicken in draft; photo not transferred into editor. No attempt to silently fix/mask these during testing. All documented in updated report. Existing old tests are historical baselines; only16 contract/regression tests rerun this turn (16pass0fail). Original full927 test run is not claimed as a new run.

Original report retained as 原报告留档.docx. Main report is updated in parent directory. User-meal image remains user-provided data; not sent to external recognition services.
