const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    appointmentNo: { type: String, unique: true, sparse: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    type: { type: String, enum: ['Checkup', 'Follow-up', 'Consultation', 'Surgery', 'Lab', 'Emergency'], default: 'Checkup' },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    reason: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledBy: { type: String },
    cancelReason: { type: String }
  },
  { timestamps: true }
);

appointmentSchema.pre('save', async function (next) {
  if (this.isNew && !this.appointmentNo) {
    const { nextId } = require('../utils/sequence');
    this.appointmentNo = await nextId('APT');
  }
  next();
});

appointmentSchema.index({ date: 1, doctorId: 1 });
appointmentSchema.index({ patientId: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);