const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const env = require('../config/env');
const User = require('../models/userModel');
const { badRequest, conflict, notFound } = require('../utils/errors');
const validation = require('../utils/validation');

const signToken = (user) => jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.jwt.secret,
    {
        algorithm: 'HS256',
        expiresIn: env.jwt.expiresIn,
        issuer: env.jwt.issuer,
        audience: env.jwt.audience
    }
);

const publicUser = (user) => ({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone,
    role: user.role,
    created_at: user.created_at
});

exports.register = async (req, res) => {
    const email = validation.email(req.body.email);
    const fullName = validation.requiredString(req.body.full_name, 'Full name', {
        min: 2,
        max: 120
    });
    const phone = validation.southAfricanPhone(req.body.phone);
    const password = validation.password(req.body.password, {
        min: 8,
        max: 128
    });

    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        throw badRequest('Password must include at least one letter and one number');
    }

    if (await User.findAuthByEmail(email)) {
        throw conflict('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
    const id = await User.create({
        email,
        password_hash: passwordHash,
        full_name: fullName,
        phone,
        role: 'customer'
    });
    const user = await User.findById(id);

    res.status(201).json({
        token: signToken(user),
        user: publicUser(user)
    });
};

exports.login = async (req, res) => {
    const email = validation.email(req.body.email);
    const password = validation.password(req.body.password, {
        min: 1,
        max: 128
    });
    const user = await User.findAuthByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
        token: signToken(user),
        user: publicUser(user)
    });
};

exports.getProfile = async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) throw notFound('User not found');
    res.json(publicUser(user));
};

exports.updateProfile = async (req, res) => {
    const updates = {};

    if (Object.hasOwn(req.body, 'full_name')) {
        updates.full_name = validation.requiredString(req.body.full_name, 'Full name', {
            min: 2,
            max: 120
        });
    }
    if (Object.hasOwn(req.body, 'phone')) {
        updates.phone = validation.southAfricanPhone(req.body.phone);
    }
    if (Object.hasOwn(req.body, 'email')) {
        updates.email = validation.email(req.body.email);
        const existing = await User.findAuthByEmail(updates.email);
        if (existing && Number(existing.id) !== Number(req.user.id)) {
            throw conflict('Email is already used by another account');
        }
    }

    if (Object.keys(updates).length === 0) {
        throw badRequest('Provide at least one profile field to update');
    }

    if (!(await User.update(req.user.id, updates))) throw notFound('User not found');
    const user = await User.findById(req.user.id);
    res.json(publicUser(user));
};
