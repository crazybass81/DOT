const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

// Protect routes - require valid JWT token
const protect = async (req, res, next) => {
  let token;

  // Check for token in header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Add user info to request
      req.user = decoded;
      
      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
};

// Admin only access
const adminOnly = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user is admin
    if (req.user.type !== 'admin' || !['MASTER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Check approval status for employee actions
const checkApprovalStatus = (allowedStatuses = ['APPROVED']) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Skip check for admin users
      if (req.user.type === 'admin') {
        return next();
      }

      const userApprovalStatus = req.user.approvalStatus;

      if (!allowedStatuses.includes(userApprovalStatus)) {
        if (userApprovalStatus === 'PENDING') {
          return res.status(403).json({
            success: false,
            error: 'Approval pending'
          });
        }
        
        if (userApprovalStatus === 'REJECTED') {
          return res.status(403).json({
            success: false,
            error: 'Account rejected'
          });
        }

        return res.status(403).json({
          success: false,
          error: 'Account not approved'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Server error'
      });
    }
  };
};

// Get current user data from database
const getCurrentUser = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next();
    }

    // Skip for admin users
    if (req.user.type === 'admin') {
      return next();
    }

    // Get fresh user data from database
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*, branches(id, name)')
      .eq('id', req.user.id)
      .single();

    if (error || !employee) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Add employee data to request
    req.employee = employee;
    
    // Update user object with fresh approval status
    req.user.approvalStatus = employee.approval_status;

    next();
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

module.exports = {
  protect,
  adminOnly,
  checkApprovalStatus,
  getCurrentUser
};