function numeric(value, positive = false) {
  return typeof value === 'number' && Number.isFinite(value) && (positive ? value > 0 : value >= 0);
}

export function validateFood(body) {
  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) return 'Food name must not be blank';
  if (body.portion !== undefined && !numeric(body.portion, true)) return 'Portion must be a positive number';
  if (body.nutrition !== undefined) {
    if (!body.nutrition || typeof body.nutrition !== 'object' || Array.isArray(body.nutrition)) return 'Nutrition must be an object';
    for (const [key, value] of Object.entries(body.nutrition)) {
      if (key.startsWith('_') || value == null || value === '') continue;
      if (!numeric(value)) return `Invalid nutrient ${key}`;
    }
  }
  return null;
}

export function validateDiary(date, body) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) return 'Invalid diary date';
  if (body.items !== undefined) {
    if (!Array.isArray(body.items)) return 'Diary items must be an array';
    for (const item of body.items) {
      if (!item || typeof item !== 'object') return 'Invalid diary item';
      const error = validateFood(item);
      if (error) return error;
      if (item.quantity !== undefined && !numeric(item.quantity, true)) return 'Quantity must be a positive number';
    }
  }
  return null;
}
