// attendance-checkin/index.ts
// Single Responsibility Principle: 출근 체크인만 담당

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

    // Dependency Injection (DI) - SOLID Principle
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Initialize services (Dependency Inversion Principle)
    const authService = new AuthService(supabase);
    const validationService = new ValidationService();
    const attendanceService = new AttendanceService(supabase);

    // Validate input
    const validation = validationService.validateCheckInData({
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
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check employee approval status (Open/Closed Principle - extensible for new statuses)
    const approvalStatus = await authService.checkEmployeeApprovalStatus(employeeId);
    
    if (approvalStatus !== "APPROVED") {
      return new Response(
        JSON.stringify({
          success: false,
          error: approvalStatus === "PENDING" 
            ? "Employee not approved" 
            : `Employee status: ${approvalStatus}`,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check for duplicate check-in
    const existingAttendance = await attendanceService.getTodayAttendance(employeeId);
    
    if (existingAttendance && existingAttendance.check_in_time) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Already checked in",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Perform check-in (Single Responsibility)
    const attendance = await attendanceService.checkIn({
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
          checkInTime: attendance.check_in_time,
          status: "WORKING",
          location: {
            id: locationId,
            latitude,
            longitude,
          },
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Check-in error:", error);
    
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