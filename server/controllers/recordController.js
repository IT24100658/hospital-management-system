const MedicalRecord = require('../models/MedicalRecord');

const list = async (req, res, next) => {
  try {
    const { patientId, doctorId, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;
    if (search) filter.diagnosis = { $regex: search, $options: 'i' };
    const total = await MedicalRecord.countDocuments(filter);
    const records = await MedicalRecord.find(filter)
      .populate('patientId', 'name patientId phone gender bloodGroup')
      .populate('doctorId', 'name specialization')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ records, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

const get = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findById(req.params.id).populate('patientId').populate('doctorId');
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json({ record });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const record = await MedicalRecord.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ record });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json({ record });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, get, create, update, remove };