// CORS configuration for QR generation edge function

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400', // 24 hours
};

export function createCorsResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

export function createErrorResponse(error: string, status: number = 400, details?: any) {
  return createCorsResponse({
    error,
    details,
    timestamp: new Date().toISOString()
  }, status);
}

export function handleCorsOptions() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}