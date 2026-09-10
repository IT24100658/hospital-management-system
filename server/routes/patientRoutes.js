const { Router } = require('express');
const {
  list,
  get,
  create,
  update,
  remove,
  uploadDocument,
  removeDocument,
  uploadMiddleware
} = require('../controllers/patientController');
const { protect, authorize, audit } = require('../middleware/auth');

const router = Router();

router.use(protect);

router.get('/', authorize('patients', 'read'), list);
router.get('/:id', authorize('patients', 'read'), get);
router.post('/', authorize('patients', 'create'), audit('patients'), create);
router.put('/:id', authorize('patients', 'update'), audit('patients'), update);
router.delete('/:id', authorize('patients', 'delete'), audit('patients'), remove);
router.post('/:id/documents', authorize('patients', 'update'), uploadMiddleware, audit('patients'), uploadDocument);
router.delete('/:id/documents/:docId', authorize('patients', 'update'), audit('patients'), removeDocument);

module.exports = router;