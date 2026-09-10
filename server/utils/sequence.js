const mongoose = require('mongoose');

const Counter = require('../models/Counter');

const nextId = async (prefix) => {
  const doc = await Counter.findByIdAndUpdate(
    prefix,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const year = String(new Date().getFullYear());
  return `${prefix}${year}${String(doc.seq).padStart(4, '0')}`;
};

module.exports = { nextId };