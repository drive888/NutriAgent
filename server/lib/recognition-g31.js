import { readFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync(new URL('../data/g31-nutrition.json', import.meta.url), 'utf8')).classes;

export function g31Candidates(raw) {
  if (!Array.isArray(raw?.predictions) || !raw.predictions.length || raw.predictions.length > 3) throw new Error('Invalid G31 predictions');
  return { candidates: raw.predictions.map(p => {
    if (typeof p.label !== 'string' || !p.label.trim() || typeof p.confidence !== 'number') throw new Error('Invalid G31 prediction');
    const entry = Object.hasOwn(catalog, p.label) ? catalog[p.label] : null;
    return { label: p.label, name: p.label.replaceAll('_', ' '), nameZh: entry?.display_zh,
      confidence: p.confidence,
      ...(entry ? { nutrition: { source: 'demo_seed', per100g: {
        calories: entry.per_100g?.kcal ?? null, proteins: entry.per_100g?.protein_g ?? null,
        carbohydrates: entry.per_100g?.carbs_g ?? null, fat: entry.per_100g?.fat_g ?? null, sodium: null,
      } }, portions: entry.portions } : {}),
    };
  }) };
}
