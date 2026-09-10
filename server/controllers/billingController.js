const Billing = require('../models/Billing');

const list = async (req, res, next) => {
  try {
    const { status, patientId, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;
    if (search) {
      const patients = await require('../models/Patient').find({
        $or: [{ name: { $regex: search, $options: 'i' } }, { patientId: { $regex: search, $options: 'i' } }]
      }).select('_id');
      filter.$or = [{ patientId: { $in: patients.map((p) => p._id) } }, { invoiceNo: { $regex: search, $options: 'i' } }];
    }
    const total = await Billing.countDocuments(filter);
    const invoices = await Billing.find(filter)
      .populate('patientId', 'name patientId phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ invoices, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

const get = async (req, res, next) => {
  try {
    const invoice = await Billing.findById(req.params.id).populate('patientId');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ invoice });
  } catch (err) {
    next(err);
  }
};

const cleanItems = (items) =>
  items
    .map((i) => ({
      description: String(i.description || '').trim(),
      category: i.category || 'Other',
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice)
    }))
    .filter((i) => i.description || i.quantity || i.unitPrice);

const validateItems = (items) => {
  if (!items.length) return 'Add at least one line item';
  for (const i of items) {
    if (!i.description) return 'Each line item needs a description';
    if (!Number.isFinite(i.quantity) || i.quantity <= 0) return 'Quantity must be greater than 0';
    if (!Number.isFinite(i.unitPrice) || i.unitPrice <= 0) return 'Unit price must be greater than 0';
  }
  return null;
};

const create = async (req, res, next) => {
  try {
    const { patientId, items = [], discount = 0, tax = 0, admissionId } = req.body;
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    if (Number(discount) < 0 || Number(tax) < 0) return res.status(400).json({ message: 'Discount and tax cannot be negative' });
    const clean = cleanItems(items);
    const msg = validateItems(clean);
    if (msg) return res.status(400).json({ message: msg });
    const normalized = clean.map((i) => ({ ...i, amount: i.unitPrice * i.quantity }));
    const invoice = await Billing.create({
      patientId,
      admissionId,
      items: normalized,
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      createdBy: req.user._id
    });
    res.status(201).json({ invoice });
  } catch (err) {
    next(err);
  }
};

const addPayment = async (req, res, next) => {
  try {
    const { amount, method, reference } = req.body;
    const invoice = await Billing.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ message: 'Invalid payment amount' });
    if (amt > invoice.total - invoice.paidAmount) return res.status(400).json({ message: 'Payment exceeds the balance due' });
    invoice.payments.push({ amount: amt, method: method || 'Cash', reference, receivedBy: req.user._id });
    await invoice.save();
    res.json({ invoice });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const invoice = await Billing.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (req.body.items) {
      const clean = cleanItems(req.body.items);
      const msg = validateItems(clean);
      if (msg) return res.status(400).json({ message: msg });
      invoice.items = clean.map((i) => ({ ...i, amount: i.unitPrice * i.quantity }));
    }
    if (req.body.discount !== undefined && Number(req.body.discount) < 0) return res.status(400).json({ message: 'Discount cannot be negative' });
    if (req.body.tax !== undefined && Number(req.body.tax) < 0) return res.status(400).json({ message: 'Tax cannot be negative' });
    await invoice.save();
    res.json({ invoice });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const invoice = await Billing.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, get, create, addPayment, update, remove };