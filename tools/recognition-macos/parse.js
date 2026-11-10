const names = { energy: /energy|calories|能量|热量/i, proteins: /protein|蛋白质/i, fat: /^(?:total\s+)?fat\b|脂肪/i, carbohydrates: /carbohydrate|carbs|碳水化合物/i, sodium: /sodium|钠/i };

export function parseLabelLines(lines) {
  const text = lines.join('\n');
  const basis = /(?:per\s*100\s*ml|每\s*100\s*毫升)/i.test(text) ? 'per100ml'
    : /(?:per\s*100\s*g\b|每\s*100\s*克)/i.test(text) ? 'per100g'
    : /per\s*serving|每份/i.test(text) ? 'perServing' : null;
  const servingMatch = text.match(/(?:serving\s*(?:size)?|每份)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(g|ml)/i);
  const nutrients = {};
  for (const [key, pattern] of Object.entries(names)) {
    const row = lines.find(line => pattern.test(line));
    // Require a physical unit. NRV percentages never count as nutrient amounts.
    const match = row?.match(/(-?\d+(?:[.,]\d+)?)\s*(kcal|kJ|mg|g|千焦|千卡|毫克|克)(?![a-z])/i);
    const units = { kj: 'kJ', kcal: 'kcal', mg: 'mg', g: 'g', '千焦': 'kJ', '千卡': 'kcal', '毫克': 'mg', '克': 'g' };
    nutrients[key] = match ? { value: Number(match[1].replace(',', '.')), unit: units[match[2].toLowerCase()] } : null;
  }
  return { name: '', basis, serving: servingMatch ? { amount: Number(servingMatch[1]), unit: servingMatch[2].toLowerCase() } : null, nutrients, rawText: text };
}

const categories = { rice: /rice/, noodles: /noodle|pasta|spaghetti/, bread: /bread|toast|bagel/, egg: /^(egg|eggs|omelet)/, chicken: /chicken/, beef: /beef|steak/, fish: /fish|salmon|tuna/, vegetables: /vegetable|broccoli|carrot|salad/, fruit: /fruit|apple|banana|orange/, milk: /^milk$/ };
export function mapImageClasses(classes) {
  const found = new Map();
  for (const row of classes) {
    if (row.confidence < 0.15) continue;
    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(row.identifier.toLowerCase()) && !found.has(category)) found.set(category, { name: category, category, confidence: row.confidence });
    }
  }
  return [...found.values()].slice(0, 5);
}

export function parseLabelBoxes(boxes) {
  const raw = parseLabelLines(boxes.map(b => b.text));
  const header = boxes.find(b => /100\s*(g|ml)\b/i.test(b.text));
  if (!header) return raw;
  raw.basis = /ml/i.test(header.text) ? 'per100ml' : 'per100g';
  const patterns = { energy: /energy|energie|能量/i, proteins: /protein|protéine|蛋白质/i, fat: /^(total\s+)?fat\b|mati[eè]res? grasses|脂肪/i, carbohydrates: /carbohydrate|glucides|kohlenhydrate|碳水化合物/i, sodium: /sodium|钠/i };
  for (const [key, pattern] of Object.entries(patterns)) {
    const label = boxes.find(b => b.x < header.x - .12 && pattern.test(b.text));
    if (!label) continue;
    const value = boxes.filter(b => Math.abs(b.x - header.x) < .055 && Math.abs(b.y - label.y) < (key === 'carbohydrates' ? .075 : .03) && /^\d+(?:[.,]\d+)?$/.test(b.text.trim())).sort((a, b) => Math.abs(a.y-label.y)-Math.abs(b.y-label.y))[0];
    const unit = value && boxes.find(b => b.x < header.x && Math.abs(b.y-value.y) < .025 && /^(?:\(?)(mg|g)(?:\)?)$/i.test(b.text.trim()));
    if (value && unit && key !== 'energy') raw.nutrients[key] = { value: Number(value.text.replace(',', '.')), unit: /mg/i.test(unit.text) ? 'mg' : 'g' };
  }
  const kcal = boxes.find(b => /^kcal$/i.test(b.text.trim()));
  const energy = kcal && boxes.find(b => Math.abs(b.y-kcal.y) < .025 && Math.abs(b.x-header.x) < .055 && /^\d+(?:[.,]\d+)?$/.test(b.text.trim()));
  if (energy) raw.nutrients.energy = { value: Number(energy.text.replace(',', '.')), unit: 'kcal' };
  return raw;
}
