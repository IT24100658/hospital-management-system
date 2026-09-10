const Appointment = require('../models/Appointment');

const toDayStart = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const toDayEnd = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const list = async (req, res, next) => {
  try {
    const { date, status, patientId, doctorId, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (date) filter.date = { $gte: toDayStart(date), $lte: toDayEnd(date) };
    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;

    let doctorIds;
    if (search) {
      const patients = await require('../models/Patient').find({
        $or: [{ name: { $regex: search, $options: 'i' } }, { patientId: { $regex: search, $options: 'i' } }]
      }).select('_id');
      const docs = await require('../models/Doctor').find({
        name: { $regex: search, $options: 'i' }
      }).select('_id');
      filter.$or = [{ patientId: { $in: patients.map((p) => p._id) } }, { doctorId: { $in: docs.map((d) => d._id) } }];
      void doctorIds;
    }

    const total = await Appointment.countDocuments(filter);
    const appointments = await Appointment.find(filter)
      .populate('patientId', 'name patientId phone gender')
      .populate('doctorId', 'name specialization fees')
      .sort({ date: -1, time: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ appointments, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

const get = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId')
      .populate('doctorId');
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json({ appointment });
  } catch (err) {
    next(err);
  }
};

const isTimeStr = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t || ''));
const notPast = (d) => {
  if (!d) return false;
  const date = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
};

const book = async (req, res, next) => {
  try {
    const { patientId, doctorId, date, time, type, reason } = req.body;
    if (!patientId || !doctorId || !date || !time) {
      return res.status(400).json({ message: 'patientId, doctorId, date and time are required' });
    }
    if (!isTimeStr(time)) return res.status(400).json({ message: 'time must be in HH:MM format' });
    if (!notPast(date)) return res.status(400).json({ message: 'Appointment date cannot be in the past' });
    const clash = await Appointment.findOne({ doctorId, date: toDayStart(date), time, status: { $nin: ['cancelled'] } });
    if (clash) return res.status(409).json({ message: 'That doctor already has an appointment at this time' });
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      date: toDayStart(date),
      time,
      type: type || 'Checkup',
      reason,
      createdBy: req.user._id
    });
    res.status(201).json({ appointment });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (req.body.date) req.body.date = toDayStart(req.body.date);
    Object.assign(appointment, req.body);
    await appointment.save();
    res.json({ appointment });
  } catch (err) {
    next(err);
  }
};

const reschedule = async (req, res, next) => {
  try {
    const { date, time } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (appointment.status === 'cancelled') return res.status(400).json({ message: 'Cannot reschedule a cancelled appointment' });
    if (time && !isTimeStr(time)) return res.status(400).json({ message: 'time must be in HH:MM format' });
    if (date && !notPast(date)) return res.status(400).json({ message: 'Appointment date cannot be in the past' });
    if (date) appointment.date = toDayStart(date);
    if (time) appointment.time = time;
    if (appointment.status === 'completed') appointment.status = 'scheduled';
    await appointment.save();
    res.json({ appointment });
  } catch (err) {
    next(err);
  }
};

const cancel = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    appointment.status = 'cancelled';
    appointment.cancelledBy = req.user.name;
    appointment.cancelReason = reason || 'No reason given';
    await appointment.save();
    res.json({ appointment });
  } catch (err) {
    next(err);
  }
};

const setStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const verdict = ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled'];
    if (!verdict.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json({ appointment });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, get, book, update, reschedule, cancel, setStatus };