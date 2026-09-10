const Doctor = require('../models/Doctor');

const list = async (req, res, next) => {
  try {
    const { search, departmentId, status } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { specialization: { $regex: search, $options: 'i' } }];
    if (departmentId) filter.departmentId = departmentId;
    if (status) filter.status = status;
    const doctors = await Doctor.find(filter).populate('departmentId');
    res.json({ doctors });
  } catch (err) {
    next(err);
  }
};

const get = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('departmentId');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json({ doctor });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const doctor = await Doctor.create(req.body);
    res.status(201).json({ doctor });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }).populate('departmentId');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json({ doctor });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json({ message: 'Doctor deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, get, create, update, remove };