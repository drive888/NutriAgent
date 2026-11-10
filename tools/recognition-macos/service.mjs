import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLabelBoxes, mapImageClasses } from './parse.js';
const exec = promisify(execFile);
const binary = process.env.VISION_BINARY || '/tmp/nt-vision';
let active = 0;
http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST' || req.url !== '/recognize') { res.writeHead(404); return res.end('{}'); }
  if (process.env.VISION_TOKEN && req.headers.authorization !== `Bearer ${process.env.VISION_TOKEN}`) { res.writeHead(401); return res.end('{}'); }
  if (active >= 2) { res.writeHead(429); return res.end('{"error":"Busy"}'); }
  let dir;
  active++;
  try {
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 9 * 1024 * 1024) throw new Error('Image too large'); }
    const { kind, image } = JSON.parse(body);
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(image);
    if (!match || !['meal', 'label'].includes(kind)) throw new Error('Invalid image or kind');
    dir = await mkdtemp(path.join(os.tmpdir(), 'nt-vision-'));
    const file = path.join(dir, `input.${match[1]}`);
    await writeFile(file, Buffer.from(match[2], 'base64'), { mode: 0o600 });
    const foodModel = kind === 'meal' && process.env.FOOD_PYTHON;
    const { stdout } = await exec(foodModel || binary, foodModel ? [fileURLToPath(new URL('./food101.py', import.meta.url)), file] : [file, kind], { timeout: 25000, maxBuffer: 1024 * 1024 });
    const raw = JSON.parse(stdout);
    const result = kind === 'meal' ? { candidates: mapImageClasses(raw.classes) } : parseLabelBoxes(raw.boxes);
    if (kind === 'label' && (!result.basis || (result.basis === 'perServing' && !result.serving))) throw new Error('Nutrition basis unclear; correct label region or enter manually');
    res.end(JSON.stringify(result));
  } catch (e) { res.writeHead(422); res.end(JSON.stringify({ error: e.message })); }
  finally { if (dir) await rm(dir, { recursive: true, force: true }); active--; }
}).listen(Number(process.env.VISION_PORT || 3210), process.env.VISION_HOST || '127.0.0.1', () => console.log('Local Apple Vision recognition adapter ready'));
