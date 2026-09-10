const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    head: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);