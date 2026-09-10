const User = require('../models/User');

const list = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { username, name, email, password, role, staffRef, active } = req.body;
    if (!username || !name || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(409).json({ message: 'User with that email/username exists' });
    const user = await User.create({ username, name, email, password, role, staffRef, active });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { name, email, role, active, staffRef, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (active !== undefined) user.active = active;
    if (staffRef !== undefined) user.staffRef = staffRef;
    if (password) user.password = password;
    await user.save();
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    if (req.params.id === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove };