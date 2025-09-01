const Joi = require('joi');

// Admin login validation
const loginSchema = Joi.object({
  username: Joi.string().required().min(3).max(50),
  password: Joi.string().required().min(6)
});

// QR scan validation
const qrScanSchema = Joi.object({
  qrCode: Joi.string().required().pattern(/^DOT_QR\|/),
  deviceId: Joi.string().required().max(255)
});

// User registration validation
const registerSchema = Joi.object({
  name: Joi.string().required().min(2).max(50),
  phone: Joi.string().required().pattern(/^010-\d{4}-\d{4}$/),
  email: Joi.string().required().email(),
  birthDate: Joi.date().required().max('now'),
  branchId: Joi.string().required(),
  deviceId: Joi.string().required().max(255),
  employeeCode: Joi.string().required().max(50),
  pin: Joi.string().required().length(4).pattern(/^\d{4}$/)
});

// Attendance validation
const checkInSchema = Joi.object({
  locationId: Joi.string().required()
});

const breakActionSchema = Joi.object({
  action: Joi.string().required().valid('START', 'END')
});

// Admin approval validation  
const approvalActionSchema = Joi.object({
  reason: Joi.string().when('$action', {
    is: 'reject',
    then: Joi.required().min(10).max(500),
    otherwise: Joi.optional()
  })
});

// QR generation validation
const qrGenerateSchema = Joi.object({
  branchId: Joi.string().required(),
  branchName: Joi.string().required().max(100)
});

// Query validation
const dateRangeSchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional().min(Joi.ref('startDate')),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

module.exports = {
  loginSchema,
  qrScanSchema,
  registerSchema,
  checkInSchema,
  breakActionSchema,
  approvalActionSchema,
  qrGenerateSchema,
  dateRangeSchema
};