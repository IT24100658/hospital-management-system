const { Router } = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  patientReport,
  appointmentReport,
  revenueReport,
  pharmacyReport,
  labReport,
  staffReport,
  salesByCategory
} = require('../controllers/reportController');

const router = Router();

router.use(protect);

router.get('/patients', authorize('reports', 'read'), patientReport);
router.get('/appointments', authorize('reports', 'read'), appointmentReport);
router.get('/revenue', authorize('reports', 'read'), revenueReport);
router.get('/pharmacy', authorize('pharmacy', 'read'), pharmacyReport);
router.get('/lab', authorize('lab', 'read'), labReport);
router.get('/staff', authorize('staff', 'read'), staffReport);
router.get('/sales', authorize('reports', 'read'), salesByCategory);

module.exports = router;