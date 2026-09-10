const LabTest = require('../models/LabTest');

const list = async (req, res, next) => {
  try {
    const { patientId, status, category, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (patientId) filter.patientId = patientId;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) filter.testName = { $regex: search, $options: 'i' };
    const total = await LabTest.countDocuments(filter);
    const tests = await LabTest.find(filter)
      .populate('patientId', 'name patientId phone gender')
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ tests, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

const get = async (req, res, next) => {
  try {
    const test = await LabTest.findById(req.params.id).populate('patientId').populate('doctorId');
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json({ test });
  } catch (err) {
    next(err);
  }
};

const request = async (req, res, next) => {
  try {
    const { patientId, doctorId, testName, category, notes, referenceRange } = req.body;
    if (!patientId || !testName) return res.status(400).json({ message: 'patientId and testName are required' });
    const test = await LabTest.create({
      patientId,
      doctorId,
      testName,
      category: category || 'Blood',
      notes,
      referenceRange,
      requestedBy: req.user._id
    });
    res.status(201).json({ test });
  } catch (err) {
    next(err);
  }
};

const collectSample = async (req, res, next) => {
  try {
    const test = await LabTest.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    test.status = 'sample-collected';
    test.sampleCollectedAt = new Date();
    await test.save();
    res.json({ test });
  } catch (err) {
    next(err);
  }
};

const enterResult = async (req, res, next) => {
  try {
    const { result, normal, notes } = req.body;
    const test = await LabTest.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    test.result = result;
    test.normal = normal || '';
    test.notes = notes || test.notes;
    test.status = 'completed';
    test.resultDate = new Date();
    test.processedBy = req.user._id;
    await test.save();
    res.json({ test });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const test = await LabTest.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json({ test });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const test = await LabTest.findByIdAndDelete(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json({ message: 'Test deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, get, request, collectSample, enterResult, update, remove };