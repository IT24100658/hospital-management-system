const { Router } = require('express');
const { list, create, update, remove } = require('../controllers/departmentController');
const { protect, authorize, audit } = require('../middleware/auth');

const router = Router();

router.use(protect);

router.get('/', authorize('doctors', 'read'), list);
router.post('/', authorize('doctors', 'create'), audit('departments'), create);
router.put('/:id', authorize('doctors', 'update'), audit('departments'), update);
router.delete('/:id', authorize('doctors', 'delete'), audit('departments'), remove);

module.exports = router;