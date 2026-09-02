const db = require('../config/db');

const identifierWhere = (value, parameterIndex = 1) => {
    const stringValue = String(value);
    if (/^\d+$/.test(stringValue)) {
        return { sql: 'id = $' + parameterIndex, params: [Number(stringValue)] };
    }
    return { sql: 'slug = $' + parameterIndex, params: [stringValue] };
};

const updateRecord = async (table, identifier, data, allowedFields) => {
    const fields = allowedFields.filter((field) => Object.hasOwn(data, field));
    if (fields.length === 0) return false;

    const setClause = fields.map((field, index) => field + ' = $' + (index + 1)).join(', ');
    const values = fields.map((field) => data[field]);
    const where = identifierWhere(identifier, fields.length + 1);
    const result = await db.query(
        'UPDATE ' + table + ' SET ' + setClause + ' WHERE ' + where.sql,
        [...values, ...where.params]
    );
    return result.rowCount > 0;
};

const deleteRecord = async (table, identifier) => {
    const where = identifierWhere(identifier);
    const result = await db.query(
        'DELETE FROM ' + table + ' WHERE ' + where.sql,
        where.params
    );
    return result.rowCount > 0;
};

const parseJson = (value, fallback) => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch (_error) {
        return fallback;
    }
};

module.exports = { deleteRecord, identifierWhere, parseJson, updateRecord };
