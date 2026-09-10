const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    type: { type: String, enum: ['Annual', 'Sick', 'Casual', 'Maternity', 'No Pay', 'Other'], default: 'Annual' },
    reason: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Leave', leaveSchema);