const mongoose = require('mongoose');

const prescriptionItemSchema = new mongoose.Schema({
  medicine: { type: String, required: true },
  dosage: { type: String },
  frequency: { type: String },
  duration: { type: String },
  instructions: { type: String },
  filled: { type: Boolean, default: false },
  filledAt: { type: Date }
});

const medicalRecordSchema = new mongoose.Schema(
  {
    recordNo: { type: String, unique: true, sparse: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    date: { type: Date, default: Date.now },
    visitType: { type: String, enum: ['OPD', 'IPD', 'Emergency', 'Follow-up'], default: 'OPD' },
    symptoms: { type: String },
    diagnosis: { type: String },
    treatmentPlan: { type: String },
    vitalSigns: {
      temperature: String,
      pulse: String,
      bloodPressure: String,
      weight: String,
      height: String
    },
    prescriptions: [prescriptionItemSchema],
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

medicalRecordSchema.pre('save', async function (next) {
  if (this.isNew && !this.recordNo) {
    const { nextId } = require('../utils/sequence');
    this.recordNo = await nextId('MR');
  }
  next();
});

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);