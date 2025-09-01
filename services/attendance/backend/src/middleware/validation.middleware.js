const validate = (schema) => {
  return async (req, res, next) => {
    try {
      const validationOptions = {
        abortEarly: false, // Return all errors
        allowUnknown: true, // Allow unknown keys
        stripUnknown: true  // Remove unknown keys
      };

      // Validate based on request method
      const dataToValidate = ['GET', 'DELETE'].includes(req.method) 
        ? req.query 
        : req.body;

      const { error, value } = await schema.validateAsync(
        dataToValidate,
        validationOptions
      );

      if (error) {
        const errors = error.details.map(detail => detail.message);
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors
        });
      }

      // Replace request data with validated data
      if (['GET', 'DELETE'].includes(req.method)) {
        req.query = value;
      } else {
        req.body = value;
      }

      next();
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: err.details ? err.details.map(d => d.message) : [err.message]
      });
    }
  };
};

module.exports = { validate };