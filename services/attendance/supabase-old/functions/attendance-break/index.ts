// attendance-break/index.ts
// Single Responsibility Principle: 휴게 시간 관리만 담당

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
    // Parse request body
    const { employeeId, action } = await req.json();

    // Dependency Injection
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authService = new AuthService(supabase);
    const validationService = new ValidationService();
    const attendanceService = new AttendanceService(supabase);

    // Validate employee ID
    const employeeValidation = validationService.validateEmployeeId(employeeId);
    if (!employeeValidation.isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: employeeValidation.error,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate action
    const actionValidation = validationService.validateBreakAction(action);
    if (!actionValidation.isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: actionValidation.error,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check employee approval status
    const approvalStatus = await authService.checkEmployeeApprovalStatus(employeeId);
    
    if (approvalStatus !== "APPROVED") {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cannot manage break: Employee status is ${approvalStatus}`,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get today's attendance
    const todayAttendance = await attendanceService.getTodayAttendance(employeeId);
    
    if (!todayAttendance) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Not checked in",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let result;
    
    if (action === "START") {
      result = await attendanceService.startBreak({
        employeeId,
        attendanceId: todayAttendance.id,
      });
      
      // Count total breaks today
      const { data: breaks } = await supabase
        .from("breaks")
        .select("id")
        .eq("attendance_id", todayAttendance.id);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            attendanceId: result.id,
            status: result.status,
            breakStartTime: result.current_break_start,
            totalBreaksToday: breaks?.length || 1,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else if (action === "END") {
      result = await attendanceService.endBreak({
        employeeId,
        attendanceId: todayAttendance.id,
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            attendanceId: result.id,
            status: result.status,
            breakEndTime: result.breakEndTime,
            breakDuration: result.breakDuration,
            totalBreakMinutes: result.break_minutes,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Break management error:", error);
    
    // Handle specific errors
    if (error.message === "Cannot start break - not in working status" ||
        error.message === "Not on break" ||
        error.message === "No active break found") {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
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