const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    nic: { type: String },
    position: { type: String, required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    phone: { type: String },
    email: { type: String, lowercase: true, trim: true },
    salary: { type: Number, default: 0 },
    joinedDate: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    address: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

staffSchema.pre('save', async function (next) {
  if (this.isNew && !this.employeeId) {
    const { nextId } = require('../utils/sequence');
    this.employeeId = await nextId('EMP');
  }
  next();
});

module.exports = mongoose.model('Staff', staffSchema);