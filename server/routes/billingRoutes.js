const { Router } = require('express');
const { protect, authorize, audit } = require('../middleware/auth');
const { list, get, create, addPayment, update, remove } = require('../controllers/billingController');

const router = Router();

router.use(protect);

router.get('/', authorize('billing', 'read'), list);
router.get('/:id', authorize('billing', 'read'), get);
router.post('/', authorize('billing', 'create'), audit('billing'), create);
router.post('/:id/payments', authorize('billing', 'update'), audit('billing'), addPayment);
router.put('/:id', authorize('billing', 'update'), audit('billing'), update);
router.delete('/:id', authorize('billing', 'delete'), audit('billing'), remove);

module.exports = router;