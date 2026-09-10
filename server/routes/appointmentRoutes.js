const { Router } = require('express');
const { list, get, book, update, reschedule, cancel, setStatus } = require('../controllers/appointmentController');
const { protect, authorize, audit } = require('../middleware/auth');

const router = Router();

router.use(protect);

router.get('/', authorize('appointments', 'read'), list);
router.get('/:id', authorize('appointments', 'read'), get);
router.post('/', authorize('appointments', 'create'), audit('appointments'), book);
router.put('/:id', authorize('appointments', 'update'), audit('appointments'), update);
router.put('/:id/reschedule', authorize('appointments', 'update'), audit('appointments'), reschedule);
router.put('/:id/cancel', authorize('appointments', 'update'), audit('appointments'), cancel);
router.put('/:id/status', authorize('appointments', 'update'), audit('appointments'), setStatus);

module.exports = router;