// _shared/services/validation.service.ts
// Single Responsibility: 입력 검증만 담당

import { 
  IValidationService, 
  ValidationResult, 
  CheckInData, 
  CheckOutData 
} from "../interfaces/attendance.interface.ts";

export class ValidationService implements IValidationService {
  validateCheckInData(data: CheckInData): ValidationResult {
    const errors: string[] = [];

    if (!data.employeeId) {
      errors.push("Employee ID is required");
    }

    if (!data.locationId) {
      errors.push("Location ID is required");
    }

    if (data.latitude === undefined || data.latitude === null) {
      errors.push("Latitude is required");
    } else if (data.latitude < -90 || data.latitude > 90) {
      errors.push("Invalid latitude value");
    }

    if (data.longitude === undefined || data.longitude === null) {
      errors.push("Longitude is required");
    } else if (data.longitude < -180 || data.longitude > 180) {
      errors.push("Invalid longitude value");
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? "Validation failed" : undefined,
      details: errors.length > 0 ? errors : undefined,
    };
  }

  validateCheckOutData(data: CheckOutData): ValidationResult {
    // Check-out has same validation as check-in
    return this.validateCheckInData(data);
  }

  validateBreakAction(action: string): ValidationResult {
    const validActions = ["START", "END"];
    
    if (!action) {
      return {
        isValid: false,
        error: "Action is required",
      };
    }

    if (!validActions.includes(action)) {
      return {
        isValid: false,
        error: `Invalid action. Must be one of: ${validActions.join(", ")}`,
      };
    }

    return {
      isValid: true,
    };
  }

  validateDateRange(startDate: string, endDate: string): ValidationResult {
    const errors: string[] = [];

    if (!startDate) {
      errors.push("Start date is required");
    }

    if (!endDate) {
      errors.push("End date is required");
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime())) {
        errors.push("Invalid start date format");
      }

      if (isNaN(end.getTime())) {
        errors.push("Invalid end date format");
      }

      if (start > end) {
        errors.push("Start date must be before or equal to end date");
      }

      // Check if date range is not too large (e.g., max 1 year)
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (end.getTime() - start.getTime() > oneYear) {
        errors.push("Date range cannot exceed 1 year");
      }
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? "Validation failed" : undefined,
      details: errors.length > 0 ? errors : undefined,
    };
  }

  validateEmployeeId(employeeId: string): ValidationResult {
    if (!employeeId) {
      return {
        isValid: false,
        error: "Employee ID is required",
      };
    }

    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(employeeId)) {
      return {
        isValid: false,
        error: "Invalid employee ID format",
      };
    }

    return {
      isValid: true,
    };
  }

  validatePagination(page?: number, limit?: number): ValidationResult {
    const errors: string[] = [];

    if (page !== undefined) {
      if (!Number.isInteger(page) || page < 1) {
        errors.push("Page must be a positive integer");
      }
    }

    if (limit !== undefined) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        errors.push("Limit must be an integer between 1 and 100");
      }
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? "Validation failed" : undefined,
      details: errors.length > 0 ? errors : undefined,
    };
  }
}