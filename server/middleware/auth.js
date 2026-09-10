const jwt = require('jsonwebtoken');
const config = require('../config/index');
const User = require('../models/User');
const { AuditLog } = require('../models/AuditLog');
const { can } = require('../utils/permissions');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id);
    if (!user || !user.active) return res.status(401).json({ message: 'Not authorized, user inactive' });

    if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime()) {
      return res.status(401).json({ message: 'Password changed, please log in again' });
    }

    req.user = user;

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
  }
};

const authorize = (module, action) => (req, res, next) => {
  if (!can(req.user.role, module, action)) {
    return res.status(403).json({ message: 'Forbidden: you do not have permission for this action' });
  }
  next();
};

const audit = (module) => (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (req.user) {
      const details = {
        method: req.method,
        path: req.originalUrl,
        body:
          req.method !== 'GET'
            ? JSON.stringify({ ...req.body, password: undefined }).slice(0, 1000)
            : undefined,
        status: res.statusCode,
        result: body && body.message ? body.message : undefined
      };
      AuditLog.create({
        user: req.user._id,
        role: req.user.role,
        action: `${req.method} ${module}`,
        entity: module,
        details: JSON.stringify(details)
      }).catch(() => {});
    }
    return originalJson(body);
  };
  next();
};

module.exports = { protect, authorize, audit };