const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema(
  {
    testNo: { type: String, unique: true, sparse: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    testName: { type: String, required: true },
    category: { type: String, enum: ['Blood', 'Urine', 'Imaging', 'Biopsy', 'Other'], default: 'Blood' },
    status: {
      type: String,
      enum: ['requested', 'sample-collected', 'in-progress', 'completed'],
      default: 'requested'
    },
    sampleCollectedAt: { type: Date },
    result: { type: String },
    resultDate: { type: Date },
    referenceRange: { type: String },
    normal: { type: String, enum: ['normal', 'abnormal', ''], default: '' },
    notes: { type: String },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

labTestSchema.pre('save', async function (next) {
  if (this.isNew && !this.testNo) {
    const { nextId } = require('../utils/sequence');
    this.testNo = await nextId('LAB');
  }
  next();
});

module.exports = mongoose.model('LabTest', labTestSchema);