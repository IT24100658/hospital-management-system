const Department = require('../models/Department');

const list = async (req, res, next) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json({ departments });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, description, head } = req.body;
    const exists = await Department.findOne({ name });
    if (exists) return res.status(409).json({ message: 'Department already exists' });
    const department = await Department.create({ name, description, head });
    res.status(201).json({ department });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json({ department });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json({ message: 'Department deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove };