# Weeks 1-3 implementation plan

Chinese localization is out of scope. Preserve existing changes and user data.

1. Audit existing business, recognition and upload flows; record contracts and gaps.
2. Add tested recognition draft contracts, nutrient basis/unit normalization, authenticated adapters, timeouts and explicit unavailable/mock states.
3. Add meal/label image preview and editable review flows without automatic writes.
4. Verify auth, food CRUD, diary math, isolation, invalid input and retries in an isolated environment.
5. Gather real images and documented independent evaluation where a real model is available; never substitute mock accuracy.
6. Deploy only verified changes, exercise the actual browser workflows, capture screenshots and generate a DOCX test report with pass/fail/blocked evidence.

Real recognition/model evaluation is currently unverified. The running app has no configured server AI provider/model/key. No team dataset was provided.
