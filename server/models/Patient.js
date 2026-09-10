const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    path: { type: String, required: true },
    mimetype: String,
    size: Number
  },
  { timestamps: true }
);

const patientSchema = new mongoose.Schema(
  {
    patientId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    dob: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    bloodGroup: { type: String },
    phone: { type: String },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String },
    emergencyContact: { type: String },
    allergies: [{ type: String }],
    insuranceProvider: { type: String },
    insuranceNo: { type: String },
    registrationFee: { type: Number, default: 0 },
    documents: [documentSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

patientSchema.pre('save', async function (next) {
  if (this.isNew && !this.patientId) {
    const { nextId } = require('../utils/sequence');
    this.patientId = await nextId('PT');
  }
  next();
});

module.exports = mongoose.model('Patient', patientSchema);