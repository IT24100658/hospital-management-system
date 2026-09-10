const PharmacyItem = require('../models/PharmacyItem');
const MedicalRecord = require('../models/MedicalRecord');

const list = async (req, res, next) => {
  try {
    const { search, category, lowStock, expiring, expired, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { code: { $regex: search, $options: 'i' } }];
    if (category) filter.category = category;
    const now = Date.now();
    if (lowStock === 'true') {
      const items = await PharmacyItem.find(filter);
      return res.json({ items: items.filter((i) => i.toJSON().lowStock).slice(0, limit) });
    }
    if (expired === 'true') filter.expiryDate = { $lt: now };
    if (expiring === 'true') filter.expiryDate = { $gte: now, $lte: new Date(now + 30 * 24 * 60 * 60 * 1000) };
    const total = await PharmacyItem.countDocuments(filter);
    const items = await PharmacyItem.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(Number(limit));
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

const get = async (req, res, next) => {
  try {
    const item = await PharmacyItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ item: item.toJSON() });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const item = await PharmacyItem.create(req.body);
    res.status(201).json({ item: item.toJSON() });
  } catch (err) {
    next(err);
  }
};const update = async (req, res, next) => {
  try {
    const item = await PharmacyItem.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ item: item.toJSON() });
  } catch (err) {
    next(err);
  }
};

const restock = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) return res.status(400).json({ message: 'Restock quantity must be a positive whole number' });
    const item = await PharmacyItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    item.quantity += qty;
    await item.save();
    res.json({ item: item.toJSON() });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const item = await PharmacyItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    next(err);
  }
};

const prescriptions = async (req, res, next) => {
  try {
    const { filled, search } = req.query;
    const recordFilter = {};
    if (filled === 'false') recordFilter['prescriptions.filled'] = false;
    if (filled === 'true') recordFilter['prescriptions.filled'] = true;
    const records = await MedicalRecord.find(recordFilter)
      .populate('patientId', 'name patientId phone')
      .populate('doctorId', 'name')
      .sort({ createdAt: -1 })
      .limit(200);
    let result = [];
    records.forEach((r) => {
      r.prescriptions.forEach((p, idx) => {
        result.push({
          recordId: r._id,
          prescriptionIndex: idx,
          medicine: p.medicine,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          filled: p.filled,
          filledAt: p.filledAt,
          patient: r.patientId,
          doctor: r.doctorId,
          date: r.date
        });
      });
    });
    result = result.filter((p) => !p.filled || filled === 'true');
    if (search) result = result.filter((p) => p.medicine.toLowerCase().includes(search.toLowerCase()));
    res.json({ prescriptions: result });
  } catch (err) {
    next(err);
  }
};

const fillPrescription = async (req, res, next) => {
  try {
    const { recordId, prescriptionIndex } = req.params;
    const record = await MedicalRecord.findById(recordId);
    if (!record) return res.status(404).json({ message: 'Medical record not found' });
    const presc = record.prescriptions[Number(prescriptionIndex)];
    if (!presc) return res.status(404).json({ message: 'Prescription not found' });

    const item = await PharmacyItem.findOne({ $or: [{ name: presc.medicine }, { code: presc.medicine }] });
    let warning = [];
    if (item) {
      if (item.quantity <= 0) warning.push(`${presc.medicine} is out of stock`);
      else {
        item.quantity -= 1;
        await item.save();
      }
    } else {
      warning.push(`${presc.medicine} not found in inventory`);
    }

    presc.filled = true;
    presc.filledAt = new Date();
    await record.save();
    res.json({ prescription: presc, warning });
  } catch (err) {
    next(err);
  }
};

const alerts = async (req, res, next) => {
  try {
    const now = Date.now();
    const items = await PharmacyItem.find();
    const lowStock = items.filter((i) => i.quantity <= i.reorderLevel);
    const expiring = items.filter((i) => i.expiryDate && i.expiryDate.getTime() > now && i.expiryDate.getTime() - now < 30 * 24 * 60 * 60 * 1000);
    const expired = items.filter((i) => i.expiryDate && i.expiryDate.getTime() < now);
    res.json({
      lowStock: lowStock.map((i) => i.toJSON()),
      expiring: expiring.map((i) => i.toJSON()),
      expired: expired.map((i) => i.toJSON())
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, get, create, update, restock, remove, prescriptions, fillPrescription, alerts };