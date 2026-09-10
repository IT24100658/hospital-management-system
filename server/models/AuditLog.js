const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String },
    role: { type: String },
    action: { type: String, required: true },
    entity: { type: String },
    details: { type: String },
    ip: { type: String }
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = { AuditLog: mongoose.model('AuditLog', auditLogSchema) };