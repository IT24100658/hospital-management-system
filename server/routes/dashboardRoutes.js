const { Router } = require('express');
const { protect } = require('../middleware/auth');
const { stats, appointmentsByDay, revenueLastMonths, recentRecords } = require('../controllers/dashboardController');

const router = Router();

router.use(protect);

router.get('/stats', stats);
router.get('/appointments-by-day', appointmentsByDay);
router.get('/revenue-months', revenueLastMonths);
router.get('/recent', recentRecords);

module.exports = router;