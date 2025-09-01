// attendance-history/index.ts
// Single Responsibility Principle: 근태 기록 조회만 담당

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
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    // Dependency Injection
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authService = new AuthService(supabase);
    const validationService = new ValidationService();
    const attendanceService = new AttendanceService(supabase);

    // Validate employee ID
    if (employeeId) {
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
    }

    // Validate date range
    if (startDate && endDate) {
      const dateValidation = validationService.validateDateRange(startDate, endDate);
      if (!dateValidation.isValid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: dateValidation.error,
            details: dateValidation.details,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Validate pagination
    const paginationValidation = validationService.validatePagination(page, limit);
    if (!paginationValidation.isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: paginationValidation.error,
          details: paginationValidation.details,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get attendance history
    const result = await attendanceService.getAttendanceHistory({
      employeeId,
      startDate,
      endDate,
      page,
      limit,
    });

    // Calculate statistics for the result set
    const statistics = result.data.length > 0 ? {
      totalDays: result.data.length,
      averageWorkMinutes: Math.round(
        result.data.reduce((sum, record) => sum + (record.actual_work_minutes || 0), 0) / 
        result.data.length
      ),
      totalWorkMinutes: result.data.reduce((sum, record) => sum + (record.actual_work_minutes || 0), 0),
      totalBreakMinutes: result.data.reduce((sum, record) => sum + (record.break_minutes || 0), 0),
    } : null;

    return new Response(
      JSON.stringify({
        success: true,
        data: result.data,
        pagination: {
          page,
          limit,
          totalRecords: result.totalRecords,
          totalPages: Math.ceil(result.totalRecords / limit),
        },
        statistics,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("History retrieval error:", error);
    
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