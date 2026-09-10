const Staff = require('../models/Staff');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');

const listStaff = async (req, res, next) => {
  try {
    const { search, departmentId, status } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { employeeId: { $regex: search, $options: 'i' } }, { position: { $regex: search, $options: 'i' } }];
    if (departmentId) filter.departmentId = departmentId;
    if (status) filter.status = status;
    const staff = await Staff.find(filter).populate('departmentId');
    res.json({ staff });
  } catch (err) {
    next(err);
  }
};

const createStaff = async (req, res, next) => {
  try {
    const staff = await Staff.create(req.body);
    res.status(201).json({ staff });
  } catch (err) {
    next(err);
  }
};

const updateStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }).populate('departmentId');
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.json({ staff });
  } catch (err) {
    next(err);
  }
};

const removeStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    await Attendance.deleteMany({ staffId: req.params.id });
    await Leave.deleteMany({ staffId: req.params.id });
    res.json({ message: 'Staff removed' });
  } catch (err) {
    next(err);
  }
};

const dayRange = (date) => {
  const d = new Date(date);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const listAttendance = async (req, res, next) => {
  try {
    const { date, staffId, status } = req.query;
    const filter = {};
    if (date) {
      const { start, end } = dayRange(date);
      filter.date = { $gte: start, $lte: end };
    }
    if (staffId) filter.staffId = staffId;
    if (status) filter.status = status;
    const records = await Attendance.find(filter).populate('staffId', 'name employeeId position departmentId').sort({ date: -1 });
    res.json({ records });
  } catch (err) {
    next(err);
  }
};

const markAttendance = async (req, res, next) => {
  try {
    const { staffId, date, timeIn, timeOut, status } = req.body;
    const { start, end } = dayRange(date || new Date());
    let record = await Attendance.findOne({ staffId, date: { $gte: start, $lte: end } });
    if (record) {
      if (timeIn !== undefined) record.timeIn = timeIn;
      if (timeOut !== undefined) record.timeOut = timeOut;
      if (status !== undefined) record.status = status;
      await record.save();
    } else {
      record = await Attendance.create({ staffId, date: start, timeIn, timeOut, status: status || 'present', markedBy: req.user._id });
    }
    res.status(201).json({ record });
  } catch (err) {
    next(err);
  }
};

const listLeaves = async (req, res, next) => {
  try {
    const { staffId, status } = req.query;
    const filter = {};
    if (staffId) filter.staffId = staffId;
    if (status) filter.status = status;
    const leaves = await Leave.find(filter).populate('staffId', 'name employeeId').sort({ startDate: -1 });
    res.json({ leaves });
  } catch (err) {
    next(err);
  }
};

const requestLeave = async (req, res, next) => {
  try {
    const { staffId, startDate, endDate, type, reason } = req.body;
    if (!staffId || !startDate || !endDate) return res.status(400).json({ message: 'staffId, startDate and endDate required' });
    const leave = await Leave.create({ staffId, startDate, endDate, type, reason });
    res.status(201).json({ leave });
  } catch (err) {
    next(err);
  }
};

const reviewLeave = async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid review status' });
    const leave = await Leave.findByIdAndUpdate(req.params.id, { status, reviewNote, approvedBy: req.user._id }, { new: true });
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });
    res.json({ leave });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listStaff,
  createStaff,
  updateStaff,
  removeStaff,
  listAttendance,
  markAttendance,
  listLeaves,
  requestLeave,
  reviewLeave
};