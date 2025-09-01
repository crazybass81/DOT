// attendance-status/index.ts
// Single Responsibility Principle: 근태 상태 조회만 담당

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";
import { AttendanceService } from "../_shared/services/attendance.service.ts";
import { ValidationService } from "../_shared/services/validation.service.ts";
import { AuthService } from "../_shared/services/auth.service.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse query parameters
    const url = new URL(req.url);
    const employeeId = url.searchParams.get("employeeId");

    if (!employeeId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Employee ID is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Dependency Injection
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authService = new AuthService(supabase);
    const validationService = new ValidationService();
    const attendanceService = new AttendanceService(supabase);

    // Validate employee ID
    const validation = validationService.validateEmployeeId(employeeId);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get attendance status
    const status = await attendanceService.getAttendanceStatus(employeeId);
    
    // Calculate working minutes if currently working
    let workingMinutes = 0;
    let breakMinutes = 0;
    
    if (status.today) {
      const now = new Date();
      const checkInTime = new Date(status.today.check_in_time);
      
      if (status.currentStatus === "WORKING" || status.currentStatus === "ON_BREAK") {
        workingMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / 60000);
        breakMinutes = status.today.break_minutes || 0;
        
        // If on break, calculate current break duration
        if (status.currentStatus === "ON_BREAK" && status.today.current_break_start) {
          const breakStart = new Date(status.today.current_break_start);
          const currentBreakMinutes = Math.floor((now.getTime() - breakStart.getTime()) / 60000);
          breakMinutes += currentBreakMinutes;
        }
        
        workingMinutes = workingMinutes - breakMinutes;
      } else if (status.currentStatus === "COMPLETED") {
        workingMinutes = status.today.actual_work_minutes || 0;
        breakMinutes = status.today.break_minutes || 0;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          employeeId,
          currentStatus: status.currentStatus,
          today: status.today ? {
            attendanceId: status.today.id,
            checkInTime: status.today.check_in_time,
            checkOutTime: status.today.check_out_time,
            workingMinutes,
            breakMinutes,
            currentBreakStart: status.today.current_break_start,
            totalWorkMinutes: status.today.total_work_minutes,
            actualWorkMinutes: status.today.actual_work_minutes,
          } : null,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Status check error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});