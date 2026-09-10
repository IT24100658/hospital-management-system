const jwt = require('jsonwebtoken');
const config = require('../config/index');
const User = require('../models/User');
const { AuditLog } = require('../models/AuditLog');

const signToken = (id) => jwt.sign({ id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

const register = async (req, res, next) => {
  try {
    const { username, name, email, password, role } = req.body;
    if (!username || !name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(409).json({ message: 'A user with that email/username already exists' });
    const user = await User.create({ username, name, email, password, role: role || 'staff' });
    const token = signToken(user._id);
    await AuditLog.create({ user: user._id, username: user.username, role: user.role, action: 'POST register' });
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Please provide username and password' });
    const user = await User.findOne({ $or: [{ username }, { email: username }] }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!user.active) return res.status(403).json({ message: 'Account is disabled. Contact administrator.' });
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    const token = signToken(user._id);
    await AuditLog.create({ user: user._id, username: user.username, role: user.role, action: 'POST login' });
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
};

const me = (req, res) => {
  res.json({ user: req.user });
};

const logout = async (req, res) => {
  await AuditLog.create({
    user: req.user._id,
    username: req.user.username,
    role: req.user.role,
    action: 'POST logout'
  });
  res.json({ message: 'Logged out successfully' });
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    const token = signToken(user._id);
    res.json({ message: 'Password changed successfully', token });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me, logout, changePassword };