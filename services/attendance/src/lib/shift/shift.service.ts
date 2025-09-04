// SOLID Principles Applied:
// S - Single Responsibility: Each class has one reason to change
// O - Open/Closed: Open for extension, closed for modification
// L - Liskov Substitution: Interfaces can be substituted
// I - Interface Segregation: Specific interfaces for specific needs
// D - Dependency Inversion: Depend on abstractions, not concretions

import { 
  Shift, 
  EmployeeShift, 
  ShiftAssignment,
  ShiftCreateDTO,
  ShiftUpdateDTO 
} from '../../types'

// Interface Segregation Principle
export interface IShiftRepository {
  create(shift: ShiftCreateDTO): Promise<Shift>
  update(id: string, shift: ShiftUpdateDTO): Promise<Shift>
  delete(id: string): Promise<void>
  findById(id: string): Promise<Shift | null>
  findByOrganization(orgId: string): Promise<Shift[]>
}

export interface IShiftAssignmentRepository {
  assign(assignment: ShiftAssignment): Promise<EmployeeShift>
  unassign(employeeId: string, shiftId: string): Promise<void>
  findByEmployee(employeeId: string): Promise<EmployeeShift[]>
  findByShift(shiftId: string): Promise<EmployeeShift[]>
  checkConflict(employeeId: string, shiftId: string, startDate: string): Promise<boolean>
}

export interface INotificationService {
  sendShiftAssignment(userId: string, shiftId: string): Promise<void>
  sendShiftUpdate(userIds: string[], shiftId: string): Promise<void>
}

export interface IAuditService {
  logShiftAction(userId: string, action: string, resource: string, data: any): Promise<void>
}

// Single Responsibility Principle: Shift validation only
export class ShiftValidator {
  validateShiftTimes(startTime: string, endTime: string): boolean {
    const start = this.parseTime(startTime)
    const end = this.parseTime(endTime)
    
    // Handle overnight shifts
    if (end < start) {
      return true // Overnight shift is valid
    }
    
    return end > start
  }

  validateDaysOfWeek(days: number[]): boolean {
    return days.every(day => day >= 1 && day <= 7)
  }

  validateBreakDuration(breakDuration: number, shiftDuration: number): boolean {
    // Break should not exceed 25% of shift duration
    return breakDuration <= shiftDuration * 0.25
  }

  private parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  calculateShiftDuration(startTime: string, endTime: string): number {
    const start = this.parseTime(startTime)
    let end = this.parseTime(endTime)
    
    // Handle overnight shifts
    if (end < start) {
      end += 24 * 60
    }
    
    return end - start
  }
}

// Single Responsibility Principle: Shift conflict detection only
export class ShiftConflictDetector {
  constructor(
    private readonly assignmentRepo: IShiftAssignmentRepository
  ) {}

  async hasConflict(
    employeeId: string, 
    shiftId: string, 
    startDate: string
  ): Promise<boolean> {
    return this.assignmentRepo.checkConflict(employeeId, shiftId, startDate)
  }

  async findOverlappingShifts(
    employeeId: string,
    startTime: string,
    endTime: string,
    daysOfWeek: number[]
  ): Promise<EmployeeShift[]> {
    const assignments = await this.assignmentRepo.findByEmployee(employeeId)
    
    return assignments.filter(assignment => {
      // Check if days overlap
      const shift = assignment.shift
      if (!shift) return false
      
      const daysOverlap = shift.days_of_week.some(day => 
        daysOfWeek.includes(day)
      )
      
      if (!daysOverlap) return false
      
      // Check if times overlap
      return this.timesOverlap(
        startTime, 
        endTime, 
        shift.start_time, 
        shift.end_time
      )
    })
  }

  private timesOverlap(
    start1: string, 
    end1: string, 
    start2: string, 
    end2: string
  ): boolean {
    const s1 = this.parseTime(start1)
    const e1 = this.parseTime(end1)
    const s2 = this.parseTime(start2)
    const e2 = this.parseTime(end2)
    
    // Handle overnight shifts
    const adjustedE1 = e1 < s1 ? e1 + 1440 : e1
    const adjustedE2 = e2 < s2 ? e2 + 1440 : e2
    
    return !(adjustedE1 <= s2 || adjustedE2 <= s1)
  }

  private parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }
}

// Main Service - Dependency Inversion Principle
export class ShiftManagementService {
  constructor(
    private readonly shiftRepo: IShiftRepository,
    private readonly assignmentRepo: IShiftAssignmentRepository,
    private readonly notificationService: INotificationService,
    private readonly auditService: IAuditService,
    private readonly validator: ShiftValidator,
    private readonly conflictDetector: ShiftConflictDetector
  ) {}

  async createShift(
    userId: string,
    organizationId: string,
    shiftData: ShiftCreateDTO
  ): Promise<Shift> {
    // Validate shift times
    if (!this.validator.validateShiftTimes(shiftData.startTime, shiftData.endTime)) {
      throw new Error('Invalid shift times')
    }

    // Validate days of week
    if (shiftData.daysOfWeek && !this.validator.validateDaysOfWeek(shiftData.daysOfWeek)) {
      throw new Error('Invalid days of week')
    }

    // Validate break duration
    const shiftDuration = this.validator.calculateShiftDuration(
      shiftData.startTime, 
      shiftData.endTime
    )
    
    if (shiftData.breakDuration && 
        !this.validator.validateBreakDuration(shiftData.breakDuration, shiftDuration)) {
      throw new Error('Break duration exceeds allowed limit')
    }

    // Create shift
    const shift = await this.shiftRepo.create({
      ...shiftData,
      organization_id: organizationId,
      is_active: true
    })

    // Audit log
    await this.auditService.logShiftAction(
      userId, 
      'create', 
      'shifts', 
      shift
    )

    return shift
  }

  async updateShift(
    userId: string,
    shiftId: string,
    shiftData: ShiftUpdateDTO
  ): Promise<Shift> {
    // Validate if needed
    if (shiftData.startTime && shiftData.endTime) {
      if (!this.validator.validateShiftTimes(shiftData.startTime, shiftData.endTime)) {
        throw new Error('Invalid shift times')
      }
    }

    // Get existing shift
    const existingShift = await this.shiftRepo.findById(shiftId)
    if (!existingShift) {
      throw new Error('Shift not found')
    }

    // Update shift
    const updatedShift = await this.shiftRepo.update(shiftId, shiftData)

    // Notify affected employees
    const assignments = await this.assignmentRepo.findByShift(shiftId)
    const userIds = assignments.map(a => a.employee?.user_id).filter(Boolean) as string[]
    
    if (userIds.length > 0) {
      await this.notificationService.sendShiftUpdate(userIds, shiftId)
    }

    // Audit log
    await this.auditService.logShiftAction(
      userId, 
      'update', 
      'shifts', 
      { old: existingShift, new: updatedShift }
    )

    return updatedShift
  }

  async assignShift(
    userId: string,
    employeeId: string,
    shiftId: string,
    startDate: string,
    endDate?: string
  ): Promise<EmployeeShift> {
    // Check for conflicts
    const hasConflict = await this.conflictDetector.hasConflict(
      employeeId, 
      shiftId, 
      startDate
    )
    
    if (hasConflict) {
      throw new Error('Employee already has a conflicting shift assignment')
    }

    // Create assignment
    const assignment = await this.assignmentRepo.assign({
      employee_id: employeeId,
      shift_id: shiftId,
      start_date: startDate,
      end_date: endDate
    })

    // Send notification
    const employee = assignment.employee
    if (employee?.user_id) {
      await this.notificationService.sendShiftAssignment(
        employee.user_id, 
        shiftId
      )
    }

    // Audit log
    await this.auditService.logShiftAction(
      userId, 
      'assign', 
      'employee_shifts', 
      assignment
    )

    return assignment
  }

  async deleteShift(
    userId: string,
    shiftId: string
  ): Promise<void> {
    // Check if shift has active assignments
    const assignments = await this.assignmentRepo.findByShift(shiftId)
    const activeAssignments = assignments.filter(a => !a.end_date)
    
    if (activeAssignments.length > 0) {
      throw new Error('Cannot delete shift with active assignments')
    }

    // Soft delete
    await this.shiftRepo.delete(shiftId)

    // Audit log
    await this.auditService.logShiftAction(
      userId, 
      'delete', 
      'shifts', 
      { shift_id: shiftId }
    )
  }

  async listShifts(organizationId: string): Promise<Shift[]> {
    return this.shiftRepo.findByOrganization(organizationId)
  }
}