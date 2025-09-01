// employee-pending/index.ts
// Single Responsibility Principle: 승인 대기 직원 조회만 담당

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";
import { ApprovalService } from "../_shared/services/approval.service.ts";
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
    const adminId = url.searchParams.get("adminId");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    // Dependency Injection
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authService = new AuthService(supabase);
    const validationService = new ValidationService();
    const approvalService = new ApprovalService(supabase);

    // Validate admin ID if provided
    if (adminId) {
      const adminValidation = validationService.validateEmployeeId(adminId);
      if (!adminValidation.isValid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: adminValidation.error,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if requester is master admin
      const isMasterAdmin = await authService.checkMasterAdminStatus(adminId);
      if (!isMasterAdmin) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Only master admin can view pending approvals",
          }),
          {
            status: 403,
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

    // Get pending employees
    const result = await approvalService.getPendingEmployees({
      page,
      limit,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: result.data.map(employee => ({
          employeeId: employee.id,
          name: employee.name,
          email: employee.email,
          phone: employee.phone,
          department: employee.department,
          position: employee.position,
          submittedAt: employee.created_at,
          approvalStatus: employee.approval_status,
        })),
        pagination: {
          page,
          limit,
          totalRecords: result.totalRecords,
          totalPages: Math.ceil(result.totalRecords / limit),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Pending employees retrieval error:", error);
    
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