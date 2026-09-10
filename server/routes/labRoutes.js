const { Router } = require('express');
const { protect, authorize, audit } = require('../middleware/auth');
const {
  list,
  get,
  request,
  collectSample,
  enterResult,
  update,
  remove
} = require('../controllers/labController');

const router = Router();

router.use(protect);

router.get('/', authorize('lab', 'read'), list);
router.get('/:id', authorize('lab', 'read'), get);
router.post('/', authorize('lab', 'create'), audit('lab'), request);
router.put('/:id/collect', authorize('lab', 'update'), audit('lab'), collectSample);
router.put('/:id/result', authorize('lab', 'update'), audit('lab'), enterResult);
router.put('/:id', authorize('lab', 'update'), audit('lab'), update);
router.delete('/:id', authorize('lab', 'delete'), audit('lab'), remove);

module.exports = router;