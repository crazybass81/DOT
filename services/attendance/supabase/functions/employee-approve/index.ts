// employee-approve/index.ts
// Single Responsibility Principle: 직원 승인 처리만 담당

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
    const { employeeId, approvedBy } = await req.json();

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

    // Validate approver ID
    const approverValidation = validationService.validateEmployeeId(approvedBy);
    if (!approverValidation.isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid approver ID",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if approver is master admin
    const isMasterAdmin = await authService.checkMasterAdminStatus(approvedBy);
    if (!isMasterAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Only master admin can approve employees",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Approve employee
    const result = await approvalService.approveEmployee({
      employeeId,
      approvedBy,
      approvedAt: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          employeeId: result.id,
          approvalStatus: result.approval_status,
          approvedBy: result.approved_by,
          approvedAt: result.approved_at,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Approval error:", error);
    
    // Handle specific errors
    if (error.message === "Employee not found" || 
        error.message === "Employee already approved") {
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