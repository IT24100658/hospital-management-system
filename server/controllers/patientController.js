const Patient = require('../models/Patient');
const upload = require('../utils/upload');

const parseQuery = (req) => {
  const { search, bloodGroup, gender, page = 1, limit = 20, sort = '-createdAt' } = req.query;
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { patientId: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  if (bloodGroup) filter.bloodGroup = bloodGroup;
  if (gender) filter.gender = gender;
  return { filter, page: Math.max(1, Number(page)), limit: Math.min(100, Math.max(1, Number(limit))), sort };
};

const list = async (req, res, next) => {
  try {
    const { filter, page, limit, sort } = parseQuery(req);
    const total = await Patient.countDocuments(filter);
    const patients = await Patient.find(filter).sort(sort).skip((page - 1) * limit).limit(limit);
    res.json({ patients, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

const get = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json({ patient });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const patient = await Patient.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ patient });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json({ patient });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json({ message: 'Patient deleted' });
  } catch (err) {
    next(err);
  }
};

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    patient.documents.push({
      filename: req.file.originalname,
      path: `/uploads/${req.file.filename}`,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    await patient.save();
    res.status(201).json({ patient });
  } catch (err) {
    next(err);
  }
};

const removeDocument = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    patient.documents = patient.documents.filter((d) => String(d._id) !== req.params.docId);
    await patient.save();
    res.json({ patient });
  } catch (err) {
    next(err);
  }
};

const uploadMiddleware = upload.single('file');

module.exports = { list, get, create, update, remove, uploadDocument, removeDocument, uploadMiddleware };