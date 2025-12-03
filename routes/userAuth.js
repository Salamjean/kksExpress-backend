const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  verifyOTP,
  logoutUser,
  getMyProfile,
  updateMyProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteMyAccount,
  cancelAccountDeletion
} = require('../controllers/user/userAuthController');

const { protectUser } = require('../middleware/userMiddleware');

// Routes publiques
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);   
router.post('/reset-password', resetPassword);

// Routes protégées (nécessitent un token user)
router.post('/logout', protectUser, logoutUser);
router.get('/profile', protectUser, getMyProfile);
router.put('/profile', protectUser, updateMyProfile);
router.put('/change-password', protectUser, changePassword);
router.delete('/account', protectUser, deleteMyAccount);
router.post('/account/cancel-deletion', protectUser, cancelAccountDeletion);

module.exports = router;