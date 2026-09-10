const isEmpty = (v) => v === undefined || v === null || String(v).trim() === '';

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());

const isPhone = (v) => {
  const digits = String(v || '').replace(/\D/g, '');
  return digits.length === 10 && digits[0] === '0';
};

const isTime = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ''));

const isNumber = (v) => v !== '' && v !== null && v !== undefined && !Number.isNaN(Number(v));

const notPast = (v) => {
  if (!v) return true;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
};

const RULES = {
  required: (v) => (isEmpty(v) ? 'This field is required' : null),
  email: (v) => (isEmpty(v) ? null : isEmail(v) ? null : 'Invalid email format'),
  phone: (v) => (isEmpty(v) ? null : isPhone(v) ? null : 'Phone must be 10 digits (e.g. 07XXXXXXXX)'),
  time: (v) => (isEmpty(v) ? null : isTime(v) ? null : 'Invalid time (use HH:MM)'),
  futureDate: (v) => (isEmpty(v) ? null : notPast(v) ? null : 'Must be today or a future date'),
  number: (v) => (isEmpty(v) ? null : isNumber(v) ? null : 'Must be a number'),
  positiveNumber: (v) =>
    isEmpty(v) ? null : isNumber(v) && Number(v) >= 0 ? null : 'Must be 0 or more',
  greaterThanZero: (v) =>
    isEmpty(v) ? null : isNumber(v) && Number(v) > 0 ? null : 'Must be greater than 0',
  positiveInt: (v) =>
    isEmpty(v) ? null : Number.isInteger(Number(v)) && Number(v) >= 0 ? null : 'Must be a whole number',
  futureMonth: (v) => {
    if (isEmpty(v)) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return 'Invalid date';
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 11);
    return d < cutoff ? 'Expiry date looks too old' : null;
  }
};

export const rule = (name, value) => {
  const fn = RULES[name];
  if (fn) return fn(value) || null;
  if (typeof name === 'function') return name(value) || null;
  return null;
};

export const validateForm = (values, rules) => {
  const errors = {};
  for (const [field, checks] of Object.entries(rules || {})) {
    for (const c of checks) {
      const msg = typeof c === 'string' ? rule(c, values[field]) : c(values[field]);
      if (msg) {
        errors[field] = msg;
        break;
      }
    }
  }
  return errors;
};

export const hasErrors = (errors) => Object.keys(errors).length > 0;