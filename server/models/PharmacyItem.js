const mongoose = require('mongoose');

const pharmacyItemSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ['Tablet', 'Syrup', 'Injection', 'Capsule', 'Ointment', 'Dressing', 'Other'], default: 'Tablet' },
    batchNo: { type: String },
    manufacturer: { type: String },
    supplier: { type: String },
    quantity: { type: Number, required: true, default: 0 },
    unitPrice: { type: Number, required: true, default: 0 },
    sellingPrice: { type: Number, required: true, default: 0 },
    expiryDate: { type: Date },
    reorderLevel: { type: Number, default: 10 },
    location: { type: String }
  },
  { timestamps: true }
);

pharmacyItemSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.lowStock = obj.quantity <= obj.reorderLevel;
  obj.expiringSoon = !!obj.expiryDate && obj.expiryDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
  obj.expired = !!obj.expiryDate && obj.expiryDate.getTime() < Date.now();
  return obj;
};

module.exports = mongoose.model('PharmacyItem', pharmacyItemSchema);