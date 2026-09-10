const { Router } = require('express');
const { list, get, create, update, remove } = require('../controllers/doctorController');
const { protect, authorize, audit } = require('../middleware/auth');

const router = Router();

router.use(protect);

router.get('/', authorize('doctors', 'read'), list);
router.get('/:id', authorize('doctors', 'read'), get);
router.post('/', authorize('doctors', 'create'), audit('doctors'), create);
router.put('/:id', authorize('doctors', 'update'), audit('doctors'), update);
router.delete('/:id', authorize('doctors', 'delete'), audit('doctors'), remove);

module.exports = router;