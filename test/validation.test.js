const test = require('node:test');
const assert = require('node:assert/strict');

const validation = require('../utils/validation');

test('normalizes email addresses', () => {
    assert.equal(validation.email('  Collector@Example.COM '), 'collector@example.com');
});

test('accepts the frontend South African phone format', () => {
    assert.equal(validation.southAfricanPhone('0821234567'), '0821234567');
});

test('does not silently alter passwords', () => {
    assert.equal(validation.password('  exact password  '), '  exact password  ');
});

test('rejects invalid South African phone numbers', () => {
    assert.throws(
        () => validation.southAfricanPhone('821234567'),
        /10-digit South African mobile number/
    );
});

test('deduplicates catalogue option arrays', () => {
    assert.deepEqual(
        validation.stringArray(['S', 'M', 'S'], 'Sizes'),
        ['S', 'M']
    );
});

test('rejects values outside an allowlist', () => {
    assert.throws(
        () => validation.oneOf('unknown', 'Status', ['available', 'sold']),
        /Status must be one of/
    );
});
