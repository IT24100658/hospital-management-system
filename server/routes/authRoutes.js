const { Router } = require('express');
const { register, login, me, logout, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);
router.post('/logout', protect, logout);
router.post('/change-password', protect, changePassword);

module.exports = router;