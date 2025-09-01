import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Test configuration
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "test-anon-key";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY") ?? "test-service-key";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.test("Attendance API - Check-in", async (t) => {
  await t.step("should successfully check in an approved employee", async () => {
    const response = await fetch(`${supabaseUrl}/functions/v1/attendance-checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        employeeId: "test-employee-001",
        locationId: "main-office",
        latitude: 37.5665,
        longitude: 126.9780,
      }),
    });

    const data = await response.json();
    
    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertExists(data.data.checkInTime);
    assertEquals(data.data.status, "WORKING");
  });

  await t.step("should reject check-in for pending approval employees", async () => {
    const response = await fetch(`${supabaseUrl}/functions/v1/attendance-checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        employeeId: "pending-employee-001",
        locationId: "main-office",
        latitude: 37.5665,
        longitude: 126.9780,
      }),
    });

    const data = await response.json();
    
    assertEquals(response.status, 403);
    assertEquals(data.success, false);
    assertEquals(data.error, "Employee not approved");
  });

  await t.step("should prevent duplicate check-in", async () => {
    // First check-in
    await fetch(`${supabaseUrl}/functions/v1/attendance-checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        employeeId: "test-employee-002",
        locationId: "main-office",
        latitude: 37.5665,
        longitude: 126.9780,
      }),
    });

    // Second check-in attempt
    const response = await fetch(`${supabaseUrl}/functions/v1/attendance-checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        employeeId: "test-employee-002",
        locationId: "main-office",
        latitude: 37.5665,
        longitude: 126.9780,
      }),
    });

    const data = await response.json();
    
    assertEquals(response.status, 400);
    assertEquals(data.success, false);
    assertEquals(data.error, "Already checked in");
  });
});

Deno.test("Attendance API - Break Management", async (t) => {
  await t.step("should start break for working employee", async () => {
    const response = await fetch(`${supabaseUrl}/functions/v1/attendance-break`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        employeeId: "test-employee-003",
        action: "START",
      }),
    });

    const data = await response.json();
    
    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertEquals(data.data.status, "ON_BREAK");
    assertExists(data.data.breakStartTime);
  });

  await t.step("should end break and resume work", async () => {
    const response = await fetch(`${supabaseUrl}/functions/v1/attendance-break`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        employeeId: "test-employee-003",
        action: "END",
      }),
    });

    const data = await response.json();
    
    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertEquals(data.data.status, "WORKING");
    assertExists(data.data.breakEndTime);
    assertExists(data.data.breakDuration);
  });
});

Deno.test("Attendance API - Check-out", async (t) => {
  await t.step("should successfully check out", async () => {
    const response = await fetch(`${supabaseUrl}/functions/v1/attendance-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        employeeId: "test-employee-004",
        locationId: "main-office",
        latitude: 37.5665,
        longitude: 126.9780,
      }),
    });

    const data = await response.json();
    
    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertEquals(data.data.status, "COMPLETED");
    assertExists(data.data.checkOutTime);
    assertExists(data.data.totalWorkMinutes);
    assertExists(data.data.actualWorkMinutes);
  });

  await t.step("should auto-end break before checkout", async () => {
    // Start a break first
    await fetch(`${supabaseUrl}/functions/v1/attendance-break`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        employeeId: "test-employee-005",
        action: "START",
      }),
    });

    // Check out (should auto-end break)
    const response = await fetch(`${supabaseUrl}/functions/v1/attendance-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        employeeId: "test-employee-005",
        locationId: "main-office",
        latitude: 37.5665,
        longitude: 126.9780,
      }),
    });

    const data = await response.json();
    
    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertEquals(data.data.autoEndedBreak, true);
    assertEquals(data.data.status, "COMPLETED");
  });
});

Deno.test("Attendance API - Status", async (t) => {
  await t.step("should return current attendance status", async () => {
    const response = await fetch(`${supabaseUrl}/functions/v1/attendance-status?employeeId=test-employee-006`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${supabaseAnonKey}`,
      },
    });

    const data = await response.json();
    
    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertExists(data.data.currentStatus);
    assertExists(data.data.today);
  });
});

Deno.test("Attendance API - History", async (t) => {
  await t.step("should return attendance history", async () => {
    const startDate = "2024-01-01";
    const endDate = "2024-01-31";
    
    const response = await fetch(
      `${supabaseUrl}/functions/v1/attendance-history?employeeId=test-employee-007&startDate=${startDate}&endDate=${endDate}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
      }
    );

    const data = await response.json();
    
    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertExists(data.data.records);
    assertExists(data.data.summary);
    assertEquals(Array.isArray(data.data.records), true);
  });
});