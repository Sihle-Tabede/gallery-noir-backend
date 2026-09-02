const { badRequest } = require('./errors');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SA_PHONE_PATTERN = /^0\d{9}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const cleanString = (value) => (
    typeof value === 'string' ? value.trim() : ''
);

const requiredString = (value, label, options = {}) => {
    const cleaned = cleanString(value);
    const { min = 1, max = 1000 } = options;

    if (cleaned.length < min || cleaned.length > max) {
        throw badRequest(label + ' must contain between ' + min + ' and ' + max + ' characters');
    }

    return cleaned;
};

const optionalString = (value, label, options = {}) => {
    if (value === undefined || value === null || value === '') return null;
    return requiredString(value, label, options);
};

const email = (value) => {
    const normalized = cleanString(value).toLowerCase();
    if (!EMAIL_PATTERN.test(normalized) || normalized.length > 254) {
        throw badRequest('Enter a valid email address');
    }
    return normalized;
};

const southAfricanPhone = (value) => {
    const normalized = cleanString(value).replace(/\s+/g, '');
    if (!SA_PHONE_PATTERN.test(normalized)) {
        throw badRequest('Enter a valid 10-digit South African mobile number beginning with 0');
    }
    return normalized;
};

const optionalPhone = (value) => {
    if (value === undefined || value === null || value === '') return null;
    return southAfricanPhone(value);
};

const password = (value, options = {}) => {
    const { min = 8, max = 128 } = options;
    if (typeof value !== 'string' || value.length < min || value.length > max) {
        throw badRequest('Password must contain between ' + min + ' and ' + max + ' characters');
    }
    return value;
};

const money = (value, label = 'Price', options = {}) => {
    const amount = Number(value);
    const { allowNull = false } = options;
    if (allowNull && (value === null || value === undefined || value === '')) return null;
    if (!Number.isFinite(amount) || amount < 0 || amount > 99999999.99) {
        throw badRequest(label + ' must be a valid non-negative amount');
    }
    return Math.round(amount * 100) / 100;
};

const integer = (value, label, options = {}) => {
    const parsed = Number(value);
    const { min = 0, max = Number.MAX_SAFE_INTEGER } = options;
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        throw badRequest(label + ' must be an integer between ' + min + ' and ' + max);
    }
    return parsed;
};

const boolean = (value, fallback) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'boolean') throw badRequest('Expected a boolean value');
    return value;
};

const slug = (value, label = 'Slug') => {
    const normalized = cleanString(value).toLowerCase();
    if (!SLUG_PATTERN.test(normalized) || normalized.length > 160) {
        throw badRequest(label + ' must use lowercase letters, numbers, and hyphens only');
    }
    return normalized;
};

const stringArray = (value, label, options = {}) => {
    const { maxItems = 20, maxLength = 80 } = options;
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || value.length > maxItems) {
        throw badRequest(label + ' must be an array with at most ' + maxItems + ' items');
    }
    return [...new Set(value.map((item) => requiredString(item, label + ' item', { max: maxLength })))];
};

const oneOf = (value, label, allowed) => {
    if (!allowed.includes(value)) {
        throw badRequest(label + ' must be one of: ' + allowed.join(', '));
    }
    return value;
};

const identifier = (value, label = 'ID') => {
    const cleaned = cleanString(value);
    if (!cleaned || cleaned.length > 160) throw badRequest(label + ' is invalid');
    return cleaned;
};

module.exports = {
    boolean,
    cleanString,
    email,
    identifier,
    integer,
    money,
    oneOf,
    optionalPhone,
    optionalString,
    password,
    requiredString,
    slug,
    southAfricanPhone,
    stringArray
};
