export const FOOD_CATEGORIES = ['rice', 'noodles', 'bread', 'egg', 'chicken', 'beef', 'fish', 'vegetables', 'fruit', 'milk'];
const UNITS = { calories: 'kcal', proteins: 'g', fat: 'g', carbohydrates: 'g', sodium: 'mg' };

function positive(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new Error(`${name} must be positive`);
  return value;
}

export function normalizeLabel(raw) {
  if (!['per100g', 'per100ml', 'perServing'].includes(raw?.basis)) throw new Error('Explicit nutrition basis required');
  let serving = null;
  if (raw.basis === 'perServing') {
    if (!['g', 'ml'].includes(raw.serving?.unit)) throw new Error('Serving unit must be g or ml');
    serving = { amount: positive(raw.serving.amount, 'Serving amount'), unit: raw.serving.unit };
  }
  const nutrition = {};
  for (const [key, unit] of Object.entries(UNITS)) {
    const item = raw.nutrients?.[key] ?? (key === 'calories' ? raw.nutrients?.energy : null);
    if (item == null || item.value == null) { nutrition[key] = null; continue; }
    let value = item.value;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`Invalid ${key}`);
    if (key === 'calories' && item.unit === 'kJ') value /= 4.184;
    else if (unit === 'mg' && item.unit === 'g') value *= 1000;
    else if (unit === 'g' && item.unit === 'mg') value /= 1000;
    else if (item.unit !== unit) throw new Error(`Invalid unit for ${key}`);
    nutrition[key] = Math.round(value * 1e6) / 1e6;
  }
  return { kind: 'label', status: 'review', name: String(raw.name || '').slice(0, 200), basis: raw.basis, serving, nutrition,
    missing: Object.keys(nutrition).filter(k => nutrition[k] == null), requiresConfirmation: true };
}

export function normalizeMeal(raw) {
  if (!Array.isArray(raw?.candidates)) throw new Error('Candidates array required');
  const candidates = raw.candidates.slice(0, 10).map(c => {
    if (typeof c.name !== 'string' || !c.name.trim()) throw new Error('Candidate name required');
    if (c.confidence != null && (typeof c.confidence !== 'number' || !Number.isFinite(c.confidence) || c.confidence < 0 || c.confidence > 1)) throw new Error('Invalid confidence');
    return { name: c.name.trim().slice(0, 200), category: FOOD_CATEGORIES.includes(c.category) ? c.category : 'unknown', confidence: c.confidence ?? null };
  });
  return { kind: 'meal', status: candidates.length ? 'review' : 'unknown', candidates, requiresConfirmation: true };
}

export function portionNutrition(draft, amount, unit) {
  positive(amount, 'Amount');
  const basisUnit = draft.basis === 'per100g' ? 'g' : draft.basis === 'per100ml' ? 'ml' : draft.serving?.unit;
  if (unit !== basisUnit) throw new Error('Mass and volume cannot be converted without density');
  const denominator = draft.basis === 'perServing' ? positive(draft.serving?.amount, 'Serving amount') : 100;
  return Object.fromEntries(Object.entries(draft.nutrition).map(([k, v]) => [k, v == null ? null : v * amount / denominator]));
}
