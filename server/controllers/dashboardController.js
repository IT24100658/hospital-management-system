const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Billing = require('../models/Billing');
const LabTest = require('../models/LabTest');
const PharmacyItem = require('../models/PharmacyItem');
const MedicalRecord = require('../models/MedicalRecord');

const dayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const monthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

const stats = async (req, res, next) => {
  try {
    const { start, end } = dayRange();
    const { start: mStart, end: mEnd } = monthRange();

    const [
      totalPatients,
      totalAppointments,
      todaysAppointments,
      pendingLab,
      monthlyRevenueAgg,
      unpaidAgg,
      lowStock,
      expiring,
      recordsCount
    ] = await Promise.all([
      Patient.countDocuments(),
      Appointment.countDocuments(),
      Appointment.countDocuments({ date: { $gte: start, $lte: end }, status: { $nin: ['cancelled'] } }),
      LabTest.countDocuments({ status: { $in: ['requested', 'sample-collected', 'in-progress'] } }),
      Billing.aggregate([{ $match: { createdAt: { $gte: mStart, $lte: mEnd } } }, { $group: { _id: null, total: { $sum: '$total' }, paid: { $sum: '$paidAmount' }, count: { $sum: 1 } } }]),
      Billing.aggregate([{ $match: { status: { $ne: 'paid' } } }, { $group: { _id: null, total: { $sum: { $subtract: ['$total', '$paidAmount'] } }, count: { $sum: 1 } } }]),
      PharmacyItem.find().then((items) => items.filter((i) => i.quantity <= i.reorderLevel).length),
      PharmacyItem.find().then(
        (items) =>
          items.filter(
            (i) => i.expiryDate && i.expiryDate.getTime() > Date.now() && i.expiryDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
          ).length
      ),
      MedicalRecord.countDocuments()
    ]);

    res.json({
      totalPatients,
      totalAppointments,
      todaysAppointments,
      pendingLab,
      recordsCount,
      monthlyRevenue: monthlyRevenueAgg[0] ? monthlyRevenueAgg[0].paid : 0,
      monthlyBilled: monthlyRevenueAgg[0] ? monthlyRevenueAgg[0].total : 0,
      unpaidDue: unpaidAgg[0] ? unpaidAgg[0].total : 0,
      unpaidInvoices: unpaidAgg[0] ? unpaidAgg[0].count : 0,
      pharmacyAlerts: { lowStock, expiring },
      today: { start, end }
    });
  } catch (err) {
    next(err);
  }
};

const appointmentsByDay = async (req, res, next) => {
  try {
    const days = 14;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    const data = await Appointment.aggregate([
      { $match: { date: { $gte: start }, status: { $nin: ['cancelled'] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const labels = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      labels.push({ key, count: 0 });
    }
    data.forEach((d) => {
      const found = labels.find((l) => l.key === d._id);
      if (found) found.count = d.count;
    });
    res.json({ labels, series: labels.map((l) => l.count) });
  } catch (err) {
    next(err);
  }
};

const revenueLastMonths = async (req, res, next) => {
  try {
    const months = 6;
    const start = new Date();
    start.setDate(1);
    start.setMonth(start.getMonth() - (months - 1));
    start.setHours(0, 0, 0, 0);
    const data = await Billing.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          billed: { $sum: '$total' },
          paid: { $sum: '$paidAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json({ series: data });
  } catch (err) {
    next(err);
  }
};

const recentRecords = async (req, res, next) => {
  try {
    const [recentPatients, todaysAppts, recentInvoices, recentLab] = await Promise.all([
      Patient.find().sort({ createdAt: -1 }).limit(5),
      Appointment.find({ date: { $gte: dayRange().start } })
        .populate('patientId', 'name patientId')
        .populate('doctorId', 'name specialization')
        .sort({ time: 1 })
        .limit(10),
      Billing.find().sort({ createdAt: -1 }).populate('patientId', 'name patientId').limit(5),
      LabTest.find({ status: { $in: ['requested', 'sample-collected', 'in-progress'] } })
        .populate('patientId', 'name patientId')
        .sort({ createdAt: 1 })
        .limit(5)
    ]);
    res.json({ recentPatients, todaysAppts, recentInvoices, recentLab });
  } catch (err) {
    next(err);
  }
};

module.exports = { stats, appointmentsByDay, revenueLastMonths, recentRecords };