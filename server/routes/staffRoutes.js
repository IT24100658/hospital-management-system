const { Router } = require('express');
const { protect, authorize, audit } = require('../middleware/auth');
const {
  listStaff,
  createStaff,
  updateStaff,
  removeStaff,
  listAttendance,
  markAttendance,
  listLeaves,
  requestLeave,
  reviewLeave
} = require('../controllers/staffController');

const router = Router();

router.use(protect);

router.get('/', authorize('staff', 'read'), listStaff);
router.post('/', authorize('staff', 'create'), audit('staff'), createStaff);
router.put('/:id', authorize('staff', 'update'), audit('staff'), updateStaff);
router.delete('/:id', authorize('staff', 'delete'), audit('staff'), removeStaff);

router.get('/attendance/list', authorize('staff', 'read'), listAttendance);
router.post('/attendance', authorize('staff', 'create'), audit('attendance'), markAttendance);

router.get('/leaves/list', authorize('staff', 'read'), listLeaves);
router.post('/leaves', authorize('staff', 'create'), audit('leaves'), requestLeave);
router.put('/leaves/:id', authorize('staff', 'update'), audit('leaves'), reviewLeave);

module.exports = router;