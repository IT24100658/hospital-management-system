const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['Consultation', 'Laboratory', 'Pharmacy', 'Admission', 'Procedure', 'Other'],
    default: 'Consultation'
  },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 }
});

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  method: { type: String, enum: ['Cash', 'Card', 'Online', 'Insurance', 'Other'], default: 'Cash' },
  date: { type: Date, default: Date.now },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reference: { type: String }
});

const billingSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, unique: true, sparse: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    admissionId: { type: mongoose.Schema.Types.ObjectId },
    items: [billItemSchema],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
    payments: [paymentSchema],
    paidAmount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

billingSchema.pre('save', async function (next) {
  if (this.isNew && !this.invoiceNo) {
    const { nextId } = require('../utils/sequence');
    this.invoiceNo = await nextId('INV');
  }
  this.subtotal = this.items.reduce((s, i) => s + (i.amount || 0), 0);
  this.total = Math.max(0, this.subtotal - this.discount + this.tax);
  this.paidAmount = this.payments.reduce((s, p) => s + (p.amount || 0), 0);
  this.status = this.paidAmount >= this.total ? 'paid' : this.paidAmount > 0 ? 'partial' : 'unpaid';
  next();
});

module.exports = mongoose.model('Billing', billingSchema);