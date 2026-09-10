const { Router } = require('express');
const { protect, authorize, audit } = require('../middleware/auth');
const {
  list,
  get,
  create,
  update,
  restock,
  remove,
  prescriptions,
  fillPrescription,
  alerts
} = require('../controllers/pharmacyController');

const router = Router();

router.use(protect);

router.get('/', authorize('pharmacy', 'read'), list);
router.get('/alerts', authorize('pharmacy', 'read'), alerts);
router.get('/prescriptions', authorize('pharmacy', 'read'), prescriptions);
router.get('/:id', authorize('pharmacy', 'read'), get);
router.post('/', authorize('pharmacy', 'create'), audit('pharmacy'), create);
router.put('/:id', authorize('pharmacy', 'update'), audit('pharmacy'), update);
router.put('/:id/restock', authorize('pharmacy', 'update'), audit('pharmacy'), restock);
router.put('/prescriptions/:recordId/:prescriptionIndex', authorize('pharmacy', 'update'), audit('pharmacy'), fillPrescription);
router.delete('/:id', authorize('pharmacy', 'delete'), audit('pharmacy'), remove);

module.exports = router;