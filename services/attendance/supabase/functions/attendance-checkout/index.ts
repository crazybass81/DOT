// attendance-checkout/index.ts
// Single Responsibility Principle: 퇴근 체크아웃만 담당

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
    const { employeeId, locationId, latitude, longitude } = await req.json();

    // Dependency Injection
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authService = new AuthService(supabase);
    const validationService = new ValidationService();
    const attendanceService = new AttendanceService(supabase);

    // Validate input
    const validation = validationService.validateCheckOutData({
      employeeId,
      locationId,
      latitude,
      longitude,
    });

    if (!validation.isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error,
          details: validation.details,
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
          error: `Cannot check out: Employee status is ${approvalStatus}`,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Perform check-out
    const attendance = await attendanceService.checkOut({
      employeeId,
      locationId,
      latitude,
      longitude,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          attendanceId: attendance.id,
          checkOutTime: attendance.check_out_time,
          status: attendance.status,
          totalWorkMinutes: attendance.total_work_minutes,
          totalBreakMinutes: attendance.break_minutes,
          actualWorkMinutes: attendance.actual_work_minutes,
          autoEndedBreak: attendance.autoEndedBreak || false,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Check-out error:", error);
    
    // Handle specific errors
    if (error.message === "No check-in record found for today") {
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

    if (error.message === "Already checked out") {
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