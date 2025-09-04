// TDD: Test-Driven Development
// Write tests first, then implement functionality

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { 
  ShiftManagementService,
  ShiftValidator,
  ShiftConflictDetector,
  IShiftRepository,
  IShiftAssignmentRepository,
  INotificationService,
  IAuditService
} from './shift.service'

describe('ShiftValidator', () => {
  let validator: ShiftValidator

  beforeEach(() => {
    validator = new ShiftValidator()
  })

  describe('validateShiftTimes', () => {
    it('should validate regular shift times', () => {
      expect(validator.validateShiftTimes('09:00', '17:00')).toBe(true)
      expect(validator.validateShiftTimes('08:30', '16:30')).toBe(true)
    })

    it('should validate overnight shifts', () => {
      expect(validator.validateShiftTimes('22:00', '06:00')).toBe(true)
      expect(validator.validateShiftTimes('23:30', '07:30')).toBe(true)
    })

    it('should reject invalid shift times', () => {
      expect(validator.validateShiftTimes('09:00', '09:00')).toBe(false)
    })
  })

  describe('validateDaysOfWeek', () => {
    it('should validate valid days', () => {
      expect(validator.validateDaysOfWeek([1, 2, 3, 4, 5])).toBe(true)
      expect(validator.validateDaysOfWeek([6, 7])).toBe(true)
    })

    it('should reject invalid days', () => {
      expect(validator.validateDaysOfWeek([0, 1, 2])).toBe(false)
      expect(validator.validateDaysOfWeek([1, 2, 8])).toBe(false)
    })
  })

  describe('validateBreakDuration', () => {
    it('should validate break within limits', () => {
      expect(validator.validateBreakDuration(60, 480)).toBe(true) // 1hr break in 8hr shift
      expect(validator.validateBreakDuration(30, 240)).toBe(true) // 30min break in 4hr shift
    })

    it('should reject excessive breaks', () => {
      expect(validator.validateBreakDuration(180, 480)).toBe(false) // 3hr break in 8hr shift
      expect(validator.validateBreakDuration(120, 240)).toBe(false) // 2hr break in 4hr shift
    })
  })

  describe('calculateShiftDuration', () => {
    it('should calculate regular shift duration', () => {
      expect(validator.calculateShiftDuration('09:00', '17:00')).toBe(480) // 8 hours
      expect(validator.calculateShiftDuration('08:30', '12:30')).toBe(240) // 4 hours
    })

    it('should calculate overnight shift duration', () => {
      expect(validator.calculateShiftDuration('22:00', '06:00')).toBe(480) // 8 hours
      expect(validator.calculateShiftDuration('23:00', '03:00')).toBe(240) // 4 hours
    })
  })
})

describe('ShiftConflictDetector', () => {
  let detector: ShiftConflictDetector
  let mockAssignmentRepo: jest.Mocked<IShiftAssignmentRepository>

  beforeEach(() => {
    mockAssignmentRepo = {
      assign: jest.fn(),
      unassign: jest.fn(),
      findByEmployee: jest.fn(),
      findByShift: jest.fn(),
      checkConflict: jest.fn()
    }
    detector = new ShiftConflictDetector(mockAssignmentRepo)
  })

  describe('hasConflict', () => {
    it('should detect conflicts', async () => {
      mockAssignmentRepo.checkConflict.mockResolvedValue(true)
      
      const result = await detector.hasConflict('emp1', 'shift1', '2025-01-01')
      
      expect(result).toBe(true)
      expect(mockAssignmentRepo.checkConflict).toHaveBeenCalledWith(
        'emp1', 
        'shift1', 
        '2025-01-01'
      )
    })

    it('should return false when no conflict', async () => {
      mockAssignmentRepo.checkConflict.mockResolvedValue(false)
      
      const result = await detector.hasConflict('emp1', 'shift1', '2025-01-01')
      
      expect(result).toBe(false)
    })
  })

  describe('findOverlappingShifts', () => {
    it('should find overlapping shifts', async () => {
      const mockAssignments = [
        {
          id: 'assign1',
          employee_id: 'emp1',
          shift_id: 'shift1',
          start_date: '2025-01-01',
          shift: {
            id: 'shift1',
            start_time: '09:00',
            end_time: '17:00',
            days_of_week: [1, 2, 3, 4, 5]
          }
        },
        {
          id: 'assign2',
          employee_id: 'emp1',
          shift_id: 'shift2',
          start_date: '2025-01-01',
          shift: {
            id: 'shift2',
            start_time: '18:00',
            end_time: '22:00',
            days_of_week: [6, 7]
          }
        }
      ]

      mockAssignmentRepo.findByEmployee.mockResolvedValue(mockAssignments)
      
      const overlapping = await detector.findOverlappingShifts(
        'emp1',
        '10:00',
        '14:00',
        [1, 2]
      )
      
      expect(overlapping).toHaveLength(1)
      expect(overlapping[0].id).toBe('assign1')
    })

    it('should not find non-overlapping shifts', async () => {
      const mockAssignments = [
        {
          id: 'assign1',
          employee_id: 'emp1',
          shift_id: 'shift1',
          start_date: '2025-01-01',
          shift: {
            id: 'shift1',
            start_time: '09:00',
            end_time: '12:00',
            days_of_week: [1, 2, 3]
          }
        }
      ]

      mockAssignmentRepo.findByEmployee.mockResolvedValue(mockAssignments)
      
      const overlapping = await detector.findOverlappingShifts(
        'emp1',
        '13:00',
        '17:00',
        [1, 2]
      )
      
      expect(overlapping).toHaveLength(0)
    })
  })
})

describe('ShiftManagementService', () => {
  let service: ShiftManagementService
  let mockShiftRepo: jest.Mocked<IShiftRepository>
  let mockAssignmentRepo: jest.Mocked<IShiftAssignmentRepository>
  let mockNotificationService: jest.Mocked<INotificationService>
  let mockAuditService: jest.Mocked<IAuditService>
  let validator: ShiftValidator
  let conflictDetector: ShiftConflictDetector

  beforeEach(() => {
    mockShiftRepo = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      findByOrganization: jest.fn()
    }

    mockAssignmentRepo = {
      assign: jest.fn(),
      unassign: jest.fn(),
      findByEmployee: jest.fn(),
      findByShift: jest.fn(),
      checkConflict: jest.fn()
    }

    mockNotificationService = {
      sendShiftAssignment: jest.fn(),
      sendShiftUpdate: jest.fn()
    }

    mockAuditService = {
      logShiftAction: jest.fn()
    }

    validator = new ShiftValidator()
    conflictDetector = new ShiftConflictDetector(mockAssignmentRepo)

    service = new ShiftManagementService(
      mockShiftRepo,
      mockAssignmentRepo,
      mockNotificationService,
      mockAuditService,
      validator,
      conflictDetector
    )
  })

  describe('createShift', () => {
    it('should create a valid shift', async () => {
      const shiftData = {
        name: 'Morning Shift',
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 60,
        daysOfWeek: [1, 2, 3, 4, 5]
      }

      const expectedShift = {
        id: 'shift1',
        ...shiftData,
        organization_id: 'org1',
        is_active: true
      }

      mockShiftRepo.create.mockResolvedValue(expectedShift)

      const result = await service.createShift('user1', 'org1', shiftData)

      expect(result).toEqual(expectedShift)
      expect(mockShiftRepo.create).toHaveBeenCalledWith({
        ...shiftData,
        organization_id: 'org1',
        is_active: true
      })
      expect(mockAuditService.logShiftAction).toHaveBeenCalled()
    })

    it('should reject shift with invalid times', async () => {
      const shiftData = {
        name: 'Invalid Shift',
        startTime: '09:00',
        endTime: '09:00',
        breakDuration: 0,
        daysOfWeek: [1]
      }

      await expect(
        service.createShift('user1', 'org1', shiftData)
      ).rejects.toThrow('Invalid shift times')
    })

    it('should reject shift with excessive break', async () => {
      const shiftData = {
        name: 'Long Break Shift',
        startTime: '09:00',
        endTime: '13:00', // 4 hour shift
        breakDuration: 120, // 2 hour break (50% of shift)
        daysOfWeek: [1]
      }

      await expect(
        service.createShift('user1', 'org1', shiftData)
      ).rejects.toThrow('Break duration exceeds allowed limit')
    })
  })

  describe('assignShift', () => {
    it('should assign shift to employee', async () => {
      mockAssignmentRepo.checkConflict.mockResolvedValue(false)
      
      const expectedAssignment = {
        id: 'assign1',
        employee_id: 'emp1',
        shift_id: 'shift1',
        start_date: '2025-01-01',
        employee: {
          id: 'emp1',
          user_id: 'user2'
        }
      }

      mockAssignmentRepo.assign.mockResolvedValue(expectedAssignment)

      const result = await service.assignShift(
        'user1',
        'emp1',
        'shift1',
        '2025-01-01'
      )

      expect(result).toEqual(expectedAssignment)
      expect(mockNotificationService.sendShiftAssignment).toHaveBeenCalledWith(
        'user2',
        'shift1'
      )
      expect(mockAuditService.logShiftAction).toHaveBeenCalled()
    })

    it('should reject assignment with conflict', async () => {
      mockAssignmentRepo.checkConflict.mockResolvedValue(true)

      await expect(
        service.assignShift('user1', 'emp1', 'shift1', '2025-01-01')
      ).rejects.toThrow('Employee already has a conflicting shift assignment')
    })
  })

  describe('deleteShift', () => {
    it('should delete shift without active assignments', async () => {
      mockAssignmentRepo.findByShift.mockResolvedValue([
        { id: 'assign1', end_date: '2024-12-31' } // Ended assignment
      ])

      await service.deleteShift('user1', 'shift1')

      expect(mockShiftRepo.delete).toHaveBeenCalledWith('shift1')
      expect(mockAuditService.logShiftAction).toHaveBeenCalled()
    })

    it('should not delete shift with active assignments', async () => {
      mockAssignmentRepo.findByShift.mockResolvedValue([
        { id: 'assign1', end_date: null } // Active assignment
      ])

      await expect(
        service.deleteShift('user1', 'shift1')
      ).rejects.toThrow('Cannot delete shift with active assignments')
    })
  })
})