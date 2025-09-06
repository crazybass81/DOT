// Configuration Service - Centralized configuration management
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface OrganizationConfig {
  organizationId: string
  workStartTime: string // HH:MM format
  workEndTime: string // HH:MM format
  standardWorkMinutes: number
  graceMinutes: number
  lunchBreakDuration: number
  overtimeThreshold: number
  locationRadius: number
  biometricEnabled: boolean
  autoCheckoutEnabled: boolean
  autoCheckoutTime: string // HH:MM format
  notificationSettings: {
    lateArrival: boolean
    earlyDeparture: boolean
    overtime: boolean
    absence: boolean
  }
  payroll: {
    baseSalary?: number
    hourlyRate: number
    overtimeRate: number
    weekendRate: number
    holidayRate: number
  }
}

// Default configuration values
const DEFAULT_CONFIG: Partial<OrganizationConfig> = {
  workStartTime: '09:00',
  workEndTime: '18:00',
  standardWorkMinutes: 8 * 60, // 8 hours
  graceMinutes: 10,
  lunchBreakDuration: 60, // 1 hour
  overtimeThreshold: 8 * 60, // 8 hours
  locationRadius: 100, // meters
  biometricEnabled: false,
  autoCheckoutEnabled: false,
  autoCheckoutTime: '23:59',
  notificationSettings: {
    lateArrival: true,
    earlyDeparture: true,
    overtime: true,
    absence: true
  },
  payroll: {
    hourlyRate: 30,
    overtimeRate: 45,
    weekendRate: 40,
    holidayRate: 50
  }
}

export class ConfigService {
  private cache = new Map<string, { config: OrganizationConfig; cachedAt: number }>()
  private readonly cacheTTL = 5 * 60 * 1000 // 5 minutes
  private supabase: any

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey)
    }
  }

  /**
   * Get configuration for an organization
   */
  async getConfig(organizationId: string): Promise<OrganizationConfig> {
    // Check cache first
    const cached = this.cache.get(organizationId)
    if (cached && Date.now() - cached.cachedAt < this.cacheTTL) {
      return cached.config
    }

    try {
      // Fetch from database
      if (this.supabase) {
        const { data, error } = await this.supabase
          .from('organization_settings')
          .select('*')
          .eq('organization_id', organizationId)
          .single()

        if (error) throw error

        if (data) {
          const config: OrganizationConfig = {
            organizationId,
            workStartTime: data.work_start_time || DEFAULT_CONFIG.workStartTime!,
            workEndTime: data.work_end_time || DEFAULT_CONFIG.workEndTime!,
            standardWorkMinutes: data.standard_work_minutes || DEFAULT_CONFIG.standardWorkMinutes!,
            graceMinutes: data.grace_minutes || DEFAULT_CONFIG.graceMinutes!,
            lunchBreakDuration: data.lunch_break_duration || DEFAULT_CONFIG.lunchBreakDuration!,
            overtimeThreshold: data.overtime_threshold || DEFAULT_CONFIG.overtimeThreshold!,
            locationRadius: data.location_radius || DEFAULT_CONFIG.locationRadius!,
            biometricEnabled: data.biometric_enabled ?? DEFAULT_CONFIG.biometricEnabled!,
            autoCheckoutEnabled: data.auto_checkout_enabled ?? DEFAULT_CONFIG.autoCheckoutEnabled!,
            autoCheckoutTime: data.auto_checkout_time || DEFAULT_CONFIG.autoCheckoutTime!,
            notificationSettings: data.notification_settings || DEFAULT_CONFIG.notificationSettings!,
            payroll: data.payroll_settings || DEFAULT_CONFIG.payroll!
          }

          // Cache the config
          this.cache.set(organizationId, { config, cachedAt: Date.now() })
          return config
        }
      }

      // Return default config if not found
      const defaultConfig: OrganizationConfig = {
        organizationId,
        ...DEFAULT_CONFIG as OrganizationConfig
      }
      
      this.cache.set(organizationId, { config: defaultConfig, cachedAt: Date.now() })
      return defaultConfig

    } catch (error) {
      console.error('Error fetching config:', error)
      // Return default config on error
      return {
        organizationId,
        ...DEFAULT_CONFIG as OrganizationConfig
      }
    }
  }

  /**
   * Update configuration for an organization
   */
  async updateConfig(organizationId: string, updates: Partial<OrganizationConfig>): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized')
    }

    try {
      const { error } = await this.supabase
        .from('organization_settings')
        .upsert({
          organization_id: organizationId,
          work_start_time: updates.workStartTime,
          work_end_time: updates.workEndTime,
          standard_work_minutes: updates.standardWorkMinutes,
          grace_minutes: updates.graceMinutes,
          lunch_break_duration: updates.lunchBreakDuration,
          overtime_threshold: updates.overtimeThreshold,
          location_radius: updates.locationRadius,
          biometric_enabled: updates.biometricEnabled,
          auto_checkout_enabled: updates.autoCheckoutEnabled,
          auto_checkout_time: updates.autoCheckoutTime,
          notification_settings: updates.notificationSettings,
          payroll_settings: updates.payroll,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      // Invalidate cache
      this.cache.delete(organizationId)

    } catch (error) {
      console.error('Error updating config:', error)
      throw error
    }
  }

  /**
   * Calculate if check-in time is late based on config
   */
  isLateCheckIn(checkInTime: Date, config: OrganizationConfig): boolean {
    const [startHour, startMinute] = config.workStartTime.split(':').map(Number)
    const graceMinutes = config.graceMinutes
    
    const hour = checkInTime.getHours()
    const minute = checkInTime.getMinutes()
    const totalMinutes = hour * 60 + minute
    const startMinutes = startHour * 60 + startMinute + graceMinutes
    
    return totalMinutes > startMinutes
  }

  /**
   * Calculate if check-out time is early based on config
   */
  isEarlyCheckOut(checkOutTime: Date, config: OrganizationConfig): boolean {
    const [endHour, endMinute] = config.workEndTime.split(':').map(Number)
    
    const hour = checkOutTime.getHours()
    const minute = checkOutTime.getMinutes()
    const totalMinutes = hour * 60 + minute
    const endMinutes = endHour * 60 + endMinute
    
    return totalMinutes < endMinutes
  }

  /**
   * Calculate overtime minutes based on config
   */
  calculateOvertime(workDurationMinutes: number, config: OrganizationConfig): number {
    const standardMinutes = config.standardWorkMinutes - config.lunchBreakDuration
    return Math.max(0, workDurationMinutes - standardMinutes)
  }

  /**
   * Get attendance status based on check-in time and config
   */
  getAttendanceStatus(checkInTime: Date, config: OrganizationConfig): 'present' | 'late' | 'early' {
    const [startHour, startMinute] = config.workStartTime.split(':').map(Number)
    const graceMinutes = config.graceMinutes
    
    const hour = checkInTime.getHours()
    const minute = checkInTime.getMinutes()
    const totalMinutes = hour * 60 + minute
    const startMinutes = startHour * 60 + startMinute
    
    if (totalMinutes <= startMinutes + graceMinutes) {
      return 'present'
    } else if (totalMinutes < startMinutes - 30) {
      return 'early'
    } else {
      return 'late'
    }
  }

  /**
   * Clear configuration cache
   */
  clearCache(organizationId?: string): void {
    if (organizationId) {
      this.cache.delete(organizationId)
    } else {
      this.cache.clear()
    }
  }
}

// Export singleton instance
export const configService = new ConfigService(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
)