const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/auth/register
exports.register = async (req, res, next) => {
    try {
        const { email, password, full_name } = req.body;

        // Validation
        if (!email || !password || !full_name) {
            return res.status(400).json({ message: 'Email, password, and full name are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Create user (default role = 'customer')
        const userId = await User.create({
            email,
            password_hash,
            full_name,
            role: 'customer'
        });

        // Generate JWT
        const token = jwt.sign(
            { id: userId, email, role: 'customer' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Return user info (without password)
        res.status(201).json({
            token,
            user: {
                id: userId,
                email,
                full_name,
                role: 'customer'
            }
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Return user info (excluding password_hash)
        res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/auth/me (Get current logged-in user profile)
// This route should be protected by the auth middleware
exports.getProfile = async (req, res, next) => {
    try {
        // req.user is set by the auth middleware
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

// Optional: PUT /api/auth/update (update own profile)
exports.updateProfile = async (req, res, next) => {
    try {
        const { full_name, email } = req.body;
        const userId = req.user.id;

        // Prevent email conflict if changed
        if (email) {
            const existing = await User.findByEmail(email);
            if (existing && existing.id !== userId) {
                return res.status(400).json({ message: 'Email already in use by another account' });
            }
        }

        const success = await User.update(userId, { full_name, email });
        if (!success) {
            return res.status(404).json({ message: 'User not found' });
        }

        const updated = await User.findById(userId);
        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};

// Optional: POST /api/auth/logout (client-side just discards token – we don't need server-side)
// But if you want to blacklist tokens, you'd need a token blacklist table – not implemented here.