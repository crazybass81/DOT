// employee-register/index.ts
// Single Responsibility Principle: 직원 등록만 담당

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";
import { ApprovalService } from "../_shared/services/approval.service.ts";
import { ValidationService } from "../_shared/services/validation.service.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { name, email, phone, department, position, deviceId } = await req.json();

    // Dependency Injection
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const validationService = new ValidationService();
    const approvalService = new ApprovalService(supabase);

    // Validate registration data
    const validation = validationService.validateRegistrationData({
      name,
      email,
      phone,
      department,
      position,
      deviceId,
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

    // Check for duplicate email
    const emailExists = await approvalService.checkEmailExists(email);
    if (emailExists) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email already registered",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check for duplicate device ID
    const deviceExists = await approvalService.checkDeviceExists(deviceId);
    if (deviceExists) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Device already registered",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Register employee (pending approval)
    const result = await approvalService.registerEmployee({
      name,
      email,
      phone,
      department,
      position,
      deviceId,
      approvalStatus: "PENDING",
      createdAt: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          employeeId: result.id,
          name: result.name,
          email: result.email,
          approvalStatus: result.approval_status,
          message: "Registration submitted successfully. Awaiting approval from master admin.",
        },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Registration error:", error);
    
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