const mongoose = require('mongoose');

const scheduleSlotSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  start: String,
  end: String
});

const doctorSchema = new mongoose.Schema(
  {
    doctorId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    specialization: { type: String, required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    phone: { type: String },
    email: { type: String, lowercase: true, trim: true },
    qualification: { type: String },
    fees: { type: Number, default: 0 },
    schedule: [scheduleSlotSchema],
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

doctorSchema.pre('save', async function (next) {
  if (this.isNew && !this.doctorId) {
    const { nextId } = require('../utils/sequence');
    this.doctorId = await nextId('DR');
  }
  next();
});

module.exports = mongoose.model('Doctor', doctorSchema);