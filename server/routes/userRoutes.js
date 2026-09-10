const { Router } = require('express');
const { list, create, update, remove } = require('../controllers/userController');
const { protect, authorize, audit } = require('../middleware/auth');

const router = Router();

router.use(protect);

router.get('/', authorize('users', 'read'), list);
router.post('/', authorize('users', 'create'), audit('users'), create);
router.put('/:id', authorize('users', 'update'), audit('users'), update);
router.delete('/:id', authorize('users', 'delete'), audit('users'), remove);

module.exports = router;