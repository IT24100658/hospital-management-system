const { Router } = require('express');
const { protect, authorize } = require('../middleware/auth');
const { AuditLog } = require('../models/AuditLog');

const router = Router();

router.use(protect, authorize('audit', 'read'));

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action } = req.query;
    const filter = {};
    if (action) filter.action = { $regex: action, $options: 'i' };
    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate('user', 'username name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;