const { Router } = require('express');
const { list, get, create, update, remove } = require('../controllers/recordController');
const { protect, authorize, audit } = require('../middleware/auth');

const router = Router();

router.use(protect);

router.get('/', authorize('records', 'read'), list);
router.get('/:id', authorize('records', 'read'), get);
router.post('/', authorize('records', 'create'), audit('records'), create);
router.put('/:id', authorize('records', 'update'), audit('records'), update);
router.delete('/:id', authorize('records', 'delete'), audit('records'), remove);

module.exports = router;