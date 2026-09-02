const User = require('../models/userModel');

module.exports = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        req.user = { ...req.user, ...user };
        return next();
    } catch (err) {
        return next(err);
    }
};
