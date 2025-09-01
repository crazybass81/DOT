const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validation.middleware');
const { 
  loginSchema, 
  qrScanSchema, 
  registerSchema 
} = require('../validators/auth.validators');

// Admin login
const adminLoginRouter = express.Router();
adminLoginRouter.post('/', validate(loginSchema), authController.adminLogin);

// QR scan
router.post('/qr/scan', validate(qrScanSchema), authController.qrScan);

// User registration
router.post('/register', validate(registerSchema), authController.register);

module.exports = {
  adminLogin: adminLoginRouter,
  qrScan: router,
  register: router
};