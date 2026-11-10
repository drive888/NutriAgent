import { Router } from 'express';
import crypto from 'node:crypto';
import { recognize } from '../lib/recognition-service.js';
import { listRecognitionEngines, resolveRecognitionEngine } from '../lib/recognition-engines.js';
import { requireAuth } from '../middleware/auth.js';
import { makeRateLimiter } from '../middleware/rate-limit.js';
import { detectImageTypeFromBuffer } from '../lib/image-magic.js';

const router = Router();
router.use(requireAuth);
router.use(makeRateLimiter({ max: 20, windowMs: 60000, label: 'recognition' }));
router.get('/engines', (_req, res) => {
  try { res.json({ engines: listRecognitionEngines() }); }
  catch { res.status(503).json({ error: 'Recognition engine configuration invalid' }); }
});
router.post('/:kind', async (req, res) => {
  const requestId = crypto.randomUUID();
  const kind = req.params.kind;
  if (!['meal', 'label'].includes(kind)) return res.status(400).json({ error: 'Unknown recognition kind', requestId });
  const image = req.body?.image;
  if (typeof image !== 'string' || image.length > 8 * 1024 * 1024) return res.status(400).json({ error: 'Image missing or too large', requestId });
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(image);
  const detected = match && detectImageTypeFromBuffer(Buffer.from(match[2], 'base64'));
  if (!detected || detected !== match[1]) return res.status(415).json({ error: 'Image bytes do not match a supported type', requestId });
  try {
    const engine = resolveRecognitionEngine(req.body?.engine, kind);
    const draft = await recognize(kind, image, engine);
    res.json({ ...draft, engine: engine.id, requestId });
  } catch (error) {
    const timeout = ['TimeoutError', 'AbortError'].includes(error.name);
    const status = timeout ? 504 : error.status || 502;
    res.status(status).json({ error: timeout ? 'Recognition timed out' : status === 400 ? 'Unsupported recognition engine' : status === 503 ? 'Recognition service not configured' : 'Recognition result invalid or service failed', requestId });
  }
});
export default router;
