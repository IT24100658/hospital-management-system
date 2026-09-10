const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Billing = require('../models/Billing');
const PharmacyItem = require('../models/PharmacyItem');
const LabTest = require('../models/LabTest');
const Staff = require('../models/Staff');
const MedicalRecord = require('../models/MedicalRecord');

const dateFilter = ({ from, to, field = 'createdAt' }) => {
  const filter = {};
  filter[field] = {};
  if (from) filter[field].$gte = new Date(from);
  if (to) filter[field].$lte = new Date(`${to}T23:59:59.999Z`);
  if (filter[field].$gte || filter[field].$lte) return filter;
  return {};
};

const patientReport = async (req, res, next) => {
  try {
    const filter = dateFilter(req.query);
    const byMonth = await Patient.aggregate([
      { $match: filter },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const byGender = await Patient.aggregate([{ $group: { _id: '$gender', count: { $sum: 1 } } }]);
    const total = await Patient.countDocuments(filter);
    res.json({ total, byMonth, byGender });
  } catch (err) {
    next(err);
  }
};

const appointmentReport = async (req, res, next) => {
  try {
    const filter = dateFilter(req.query, 'date');
    const byStatus = await Appointment.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
    const byDay = await Appointment.aggregate([
      { $match: filter },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const total = await Appointment.countDocuments(filter);
    res.json({ total, byStatus, byDay });
  } catch (err) {
    next(err);
  }
};

const revenueReport = async (req, res, next) => {
  try {
    const query = dateFilter(req.query);
    const match = query;
    const byCategory = await Billing.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $group: { _id: '$items.category', amount: { $sum: '$items.amount' } } }
    ]);
    const byStatus = await Billing.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$total' } } }]);
    const summary = await Billing.aggregate([
      { $match: match },
      { $group: { _id: null, billed: { $sum: '$total' }, collected: { $sum: '$paidAmount' }, outstanding: { $sum: { $subtract: ['$total', '$paidAmount'] } }, invoices: { $sum: 1 } } }
    ]);
    res.json({ summary: summary[0] || { billed: 0, collected: 0, outstanding: 0, invoices: 0 }, byCategory, byStatus });
  } catch (err) {
    next(err);
  }
};

const pharmacyReport = async (req, res, next) => {
  try {
    const [byCategory, lowStock, expiring, expired, totalItems] = await Promise.all([
      PharmacyItem.aggregate([{ $group: { _id: '$category', count: { $sum: 1 }, value: { $sum: { $multiply: ['$quantity', '$unitPrice'] } } } }]),
      PharmacyItem.find().then((i) => i.filter((x) => x.quantity <= x.reorderLevel).map((x) => x.toJSON())),
      PharmacyItem.find().then((i) => i.filter((x) => x.expiryDate && x.expiryDate.getTime() > Date.now() && x.expiryDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000).length),
      PharmacyItem.find().then((i) => i.filter((x) => x.expiryDate && x.expiryDate.getTime() < Date.now()).length),
      PharmacyItem.countDocuments()
    ]);
    const stockValue = await PharmacyItem.aggregate([{ $group: { _id: null, value: { $sum: { $multiply: ['$quantity', '$unitPrice'] } } } }]);
    res.json({ totalItems, stockValue: stockValue[0] ? stockValue[0].value : 0, expiring, expired, byCategory, lowStock });
  } catch (err) {
    next(err);
  }
};

const labReport = async (req, res, next) => {
  try {
    const filter = dateFilter(req.query);
    const byStatus = await LabTest.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
    const byCategory = await LabTest.aggregate([{ $match: filter }, { $group: { _id: '$category', count: { $sum: 1 } } }]);
    const total = await LabTest.countDocuments(filter);
    res.json({ total, byStatus, byCategory });
  } catch (err) {
    next(err);
  }
};

const staffReport = async (req, res, next) => {
  try {
    const byPosition = await Staff.aggregate([{ $group: { _id: '$position', count: { $sum: 1 } } }]);
    const byDepartment = await Staff.aggregate([
      { $lookup: { from: 'departments', localField: 'departmentId', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$dept.name', count: { $sum: 1 } } }
    ]);
    const total = await Staff.countDocuments();
    const active = await Staff.countDocuments({ status: 'active' });
    const records = await MedicalRecord.countDocuments();
    res.json({ total, active, records, byPosition, byDepartment });
  } catch (err) {
    next(err);
  }
};

const salesByCategory = async (req, res, next) => {
  try {
    const filter = dateFilter(req.query);
    const data = await Billing.aggregate([
      { $match: filter },
      { $unwind: '$items' },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, category: { $push: { cat: '$items.category', amt: '$items.amount' } }, total: { $sum: '$items.amount' } } },
      { $sort: { _id: 1 } }
    ]);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

module.exports = { patientReport, appointmentReport, revenueReport, pharmacyReport, labReport, staffReport, salesByCategory };