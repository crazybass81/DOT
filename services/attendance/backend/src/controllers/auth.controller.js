const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const QRService = require('../services/qr.service');

class AuthController {
  // Admin login
  async adminLogin(req, res, next) {
    try {
      const { username, password } = req.body;

      // Check master admin credentials
      if (username === process.env.MASTER_ADMIN_USERNAME &&
          password === process.env.MASTER_ADMIN_PASSWORD) {
        
        // Generate admin token
        const adminToken = jwt.sign(
          {
            id: 'master-admin',
            username,
            role: 'MASTER_ADMIN',
            type: 'admin'
          },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        return res.status(200).json({
          success: true,
          data: {
            adminToken,
            redirectTo: '/admin/dashboard',
            user: {
              id: 'master-admin',
              username,
              role: 'MASTER_ADMIN'
            }
          }
        });
      }

      // Check database for other admin users
      const { data: admin, error } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !admin) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, admin.password_hash);
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Generate token
      const adminToken = jwt.sign(
        {
          id: admin.id,
          username: admin.username,
          role: admin.role,
          type: 'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

      res.status(200).json({
        success: true,
        data: {
          adminToken,
          redirectTo: '/admin/dashboard',
          user: {
            id: admin.id,
            username: admin.username,
            role: admin.role
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // QR code scan
  async qrScan(req, res, next) {
    try {
      const { qrCode, deviceId } = req.body;
      
      // Validate QR code format
      if (!QRService.validateQRCode(qrCode)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid QR code format'
        });
      }

      // Parse QR code
      const qrData = QRService.parseQRCode(qrCode);
      
      // Check if QR code is expired (5 minutes)
      if (QRService.isExpired(qrData.timestamp)) {
        return res.status(400).json({
          success: false,
          error: 'QR code expired'
        });
      }

      // Check if user exists with this device
      const { data: employee, error } = await supabase
        .from('employees')
        .select('*, branches(name)')
        .eq('qr_registered_device_id', deviceId)
        .single();

      if (error || !employee) {
        // New user - needs registration
        return res.status(200).json({
          success: true,
          data: {
            status: 'NOT_REGISTERED',
            redirectTo: '/register',
            branchId: qrData.locationId,
            qrData
          }
        });
      }

      // Check approval status
      if (employee.approval_status === 'PENDING') {
        return res.status(200).json({
          success: true,
          data: {
            status: 'PENDING_APPROVAL',
            redirectTo: '/approval-pending',
            employeeId: employee.id
          }
        });
      }

      if (employee.approval_status === 'REJECTED') {
        return res.status(200).json({
          success: true,
          data: {
            status: 'REJECTED',
            message: employee.rejection_reason || 'Registration rejected',
            redirectTo: '/register'
          }
        });
      }

      // User is registered and approved
      return res.status(200).json({
        success: true,
        data: {
          status: 'REGISTERED',
          redirectTo: '/dashboard',
          employeeId: employee.id,
          branchName: employee.branches?.name
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // User registration
  async register(req, res, next) {
    try {
      const { 
        name, 
        phone, 
        email, 
        birthDate, 
        branchId, 
        deviceId,
        employeeCode,
        pin
      } = req.body;

      // Check if email already exists
      const { data: existing } = await supabase
        .from('employees')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Email already registered'
        });
      }

      // Check if employee code already exists
      const { data: existingCode } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_code', employeeCode)
        .single();

      if (existingCode) {
        return res.status(409).json({
          success: false,
          error: 'Employee code already in use'
        });
      }

      // Parse name into first and last
      const nameParts = name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];

      // Hash PIN
      const pinHash = await bcrypt.hash(pin, 10);

      // Create employee record
      const { data: employee, error: createError } = await supabase
        .from('employees')
        .insert({
          id: uuidv4(),
          employee_code: employeeCode,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          birth_date: birthDate,
          branch_id: branchId,
          pin_hash: pinHash,
          qr_registered: true,
          qr_registered_at: new Date().toISOString(),
          qr_registered_device_id: deviceId,
          approval_status: 'PENDING',
          is_active: false
        })
        .select()
        .single();

      if (createError) {
        console.error('Registration error:', createError);
        return res.status(500).json({
          success: false,
          error: 'Failed to register employee'
        });
      }

      // Create approval request
      await supabase
        .from('approval_requests')
        .insert({
          id: uuidv4(),
          employee_id: employee.id,
          request_type: 'REGISTRATION',
          request_data: {
            employeeCode,
            name,
            email,
            phone,
            branchId,
            deviceId
          },
          status: 'PENDING',
          requested_at: new Date().toISOString()
        });

      // Generate token (limited access until approved)
      const userToken = jwt.sign(
        {
          id: employee.id,
          email: employee.email,
          role: 'EMPLOYEE',
          approvalStatus: 'PENDING'
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.status(201).json({
        success: true,
        data: {
          userToken,
          userId: employee.id,
          redirectTo: '/approval-pending',
          approvalStatus: 'PENDING'
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();