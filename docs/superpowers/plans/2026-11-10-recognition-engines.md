# Recognition engines and G31 implementation plan

User authorized G31 integration plus an engine selector on the existing recognition screen (2026-11-10). Preserve existing entry points, photo/editor state, bilingual UI and explicit confirmation. No commit/push or user-record writes in this task.

Architecture: a server-owned engine registry resolves IDs to configured adapters and supported kinds. Client never supplies provider URLs. Keep JSON legacy adapter; add G31 multipart adapter. Normalize all outputs into the existing review contract with optional per-candidate demo nutrition and reference portions. Missing nutrients stay unknown.

- [x] Add failing Node tests: registry kind/ID validation and secret-free listing; multipart request and Top-3 preservation; nutrition seed validation, zero/missing handling and reference-portion math; reviewed nutrition reaches editor.
- [x] Selectively import supplied G31 service, weights, calibration and sample; use isolated Python venv, CPU, safe weights-only loading; validate real /health, /predict and malformed image.
- [x] Implement registry/adapters, authenticated engine listing and validated selection; retain old clients' default legacy behavior. No silent engine fallback.
- [x] Add engine select and explanatory hints in current page and embedded editor; reset old result on kind/engine/candidate changes; show reference portions and rounded estimates. Preserve photo and edited food identity.
- [x] Run focused/full regression, i18n validation, staged production build. Deploy only preview3103 with configured G31 service.
- [x] Verify real browser upload -> G31 Top-3 -> candidate/portion change -> confirmed unsaved editor, engine switching, unavailable service, Chinese/English and mobile. Record limitations and evidence.

Acceptance examples: pizza200g=532kcal from supplied approximate seed; sodium remains unknown. Unknown class retains label/confidence and has no invented nutrition. Unsupported engine/kind returns400; unconfigured engine503. Provider timeout504; no result reuse after engine switch. Existing legacy label OCR path remains unchanged.
