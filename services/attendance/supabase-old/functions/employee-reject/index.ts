// employee-reject/index.ts
// Single Responsibility Principle: 직원 거절 처리만 담당

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
    // Parse request body
    const { employeeId, rejectedBy, rejectionReason } = await req.json();

    // Dependency Injection
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authService = new AuthService(supabase);
    const validationService = new ValidationService();
    const approvalService = new ApprovalService(supabase);

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

    // Validate rejecter ID
    const rejecterValidation = validationService.validateEmployeeId(rejectedBy);
    if (!rejecterValidation.isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid rejecter ID",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate rejection reason
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Rejection reason must be at least 10 characters",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if rejecter is master admin
    const isMasterAdmin = await authService.checkMasterAdminStatus(rejectedBy);
    if (!isMasterAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Only master admin can reject employees",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Reject employee
    const result = await approvalService.rejectEmployee({
      employeeId,
      rejectedBy,
      rejectedAt: new Date().toISOString(),
      rejectionReason,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          employeeId: result.id,
          approvalStatus: result.approval_status,
          rejectedBy: result.rejected_by,
          rejectedAt: result.rejected_at,
          rejectionReason: result.rejection_reason,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Rejection error:", error);
    
    // Handle specific errors
    if (error.message === "Employee not found" || 
        error.message === "Employee already processed") {
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