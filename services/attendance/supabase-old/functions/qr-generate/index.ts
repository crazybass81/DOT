import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// QR Code generation utility adapted for Deno
class QRCodeData {
  id!: string;
  type!: 'check-in' | 'check-out' | 'event' | 'visitor';
  branchId!: string;
  branchName!: string;
  locationId?: string;
  eventId?: string;
  createdAt!: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  signature!: string;
}

interface QRCodeConfig {
  type: 'check-in' | 'check-out' | 'event' | 'visitor';
  branchId: string;
  branchName: string;
  locationId?: string;
  eventId?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

interface BatchQRRequest {
  branches: Array<{
    branchId: string;
    branchName: string;
    types: QRCodeConfig['type'][];
    locationIds?: string[];
  }>;
  options?: {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  };
  expiresAt?: Date;
  storageFolder?: string;
}

// Generate QR code using a simple implementation
async function generateQRCodeDataURL(data: string, options: any = {}): Promise<string> {
  // For production, integrate with a QR code library compatible with Deno
  // For now, returning a placeholder that would be replaced with actual QR generation
  const qrData = {
    width: options.width || 256,
    margin: options.margin || 2,
    data: data,
    timestamp: Date.now()
  };
  
  // This would be replaced with actual QR code generation
  // Using a web service or Deno-compatible QR library
  const response = await fetch('https://api.qrserver.com/v1/create-qr-code/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      size: `${options.width || 256}x${options.width || 256}`,
      data: data,
      format: 'png',
      margin: options.margin || 2,
      ecc: options.errorCorrectionLevel || 'M'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate QR code');
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  return `data:image/png;base64,${base64}`;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateSignature(data: Omit<QRCodeData, 'signature'>): string {
  const payload = JSON.stringify({
    id: data.id,
    type: data.type,
    branchId: data.branchId,
    createdAt: data.createdAt.toISOString(),
    expiresAt: data.expiresAt?.toISOString()
  });
  
  return btoa(payload).slice(-16);
}

function createQRData(config: QRCodeConfig): QRCodeData {
  const id = generateUUID();
  const createdAt = new Date();
  
  const qrData: Omit<QRCodeData, 'signature'> = {
    id,
    type: config.type,
    branchId: config.branchId,
    branchName: config.branchName,
    locationId: config.locationId,
    eventId: config.eventId,
    createdAt,
    expiresAt: config.expiresAt,
    metadata: config.metadata
  };

  return {
    ...qrData,
    signature: generateSignature(qrData)
  } as QRCodeData;
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'generate';

    if (req.method === 'POST') {
      const body = await req.json();

      switch (action) {
        case 'generate': {
          const config: QRCodeConfig = body;
          
          // Validate required fields
          if (!config.branchId || !config.branchName || !config.type) {
            return new Response(
              JSON.stringify({ error: 'Missing required fields: branchId, branchName, type' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          // Create QR data
          const qrData = createQRData(config);
          const qrString = JSON.stringify(qrData);

          // Generate QR code image
          const dataUrl = await generateQRCodeDataURL(qrString, body.options || {});
          
          // Store in Supabase Storage
          const fileName = `qr-${qrData.id}.png`;
          const folderPath = body.storageFolder || 'qr-codes';
          const filePath = `${folderPath}/${fileName}`;

          // Convert data URL to file
          const base64Data = dataUrl.split(',')[1];
          const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('attendance-assets')
            .upload(filePath, binaryData, {
              contentType: 'image/png',
              upsert: true
            });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return new Response(
              JSON.stringify({ error: 'Failed to store QR code image', details: uploadError.message }),
              { 
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('attendance-assets')
            .getPublicUrl(filePath);

          // Store QR code metadata in database
          const { data: dbData, error: dbError } = await supabase
            .from('qr_codes')
            .insert({
              id: qrData.id,
              type: qrData.type,
              branch_id: qrData.branchId,
              branch_name: qrData.branchName,
              location_id: qrData.locationId,
              event_id: qrData.eventId,
              created_at: qrData.createdAt.toISOString(),
              expires_at: qrData.expiresAt?.toISOString(),
              metadata: qrData.metadata,
              signature: qrData.signature,
              image_url: urlData.publicUrl,
              storage_path: filePath
            })
            .select()
            .single();

          if (dbError) {
            console.error('Database insert error:', dbError);
            // Don't fail the request, just log the error
          }

          return new Response(
            JSON.stringify({
              success: true,
              qrData,
              dataUrl,
              imageUrl: urlData.publicUrl,
              storagePath: filePath
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        case 'batch': {
          const request: BatchQRRequest = body;
          
          if (!request.branches || !Array.isArray(request.branches)) {
            return new Response(
              JSON.stringify({ error: 'Invalid batch request: branches array required' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          const results = [];
          const folderPath = request.storageFolder || 'qr-codes/batch';

          for (const branch of request.branches) {
            for (const type of branch.types) {
              // Generate for branch-level QR codes
              const branchConfig: QRCodeConfig = {
                type,
                branchId: branch.branchId,
                branchName: branch.branchName,
                expiresAt: request.expiresAt ? new Date(request.expiresAt) : undefined,
                metadata: {
                  batchGenerated: true,
                  generatedAt: new Date().toISOString()
                }
              };

              const qrData = createQRData(branchConfig);
              const qrString = JSON.stringify(qrData);
              const dataUrl = await generateQRCodeDataURL(qrString, request.options || {});

              // Store in Supabase Storage
              const fileName = `${branch.branchName}_${type}_${qrData.id.slice(0, 8)}.png`;
              const filePath = `${folderPath}/${fileName}`;

              const base64Data = dataUrl.split(',')[1];
              const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('attendance-assets')
                .upload(filePath, binaryData, {
                  contentType: 'image/png',
                  upsert: true
                });

              if (!uploadError) {
                const { data: urlData } = supabase.storage
                  .from('attendance-assets')
                  .getPublicUrl(filePath);

                results.push({
                  qrData,
                  dataUrl,
                  imageUrl: urlData.publicUrl,
                  filename: fileName,
                  storagePath: filePath
                });

                // Store in database
                await supabase
                  .from('qr_codes')
                  .insert({
                    id: qrData.id,
                    type: qrData.type,
                    branch_id: qrData.branchId,
                    branch_name: qrData.branchName,
                    location_id: qrData.locationId,
                    event_id: qrData.eventId,
                    created_at: qrData.createdAt.toISOString(),
                    expires_at: qrData.expiresAt?.toISOString(),
                    metadata: qrData.metadata,
                    signature: qrData.signature,
                    image_url: urlData.publicUrl,
                    storage_path: filePath
                  });
              }

              // Generate for specific locations if provided
              if (branch.locationIds) {
                for (const locationId of branch.locationIds) {
                  const locationConfig: QRCodeConfig = {
                    ...branchConfig,
                    locationId,
                    metadata: {
                      ...branchConfig.metadata,
                      locationId
                    }
                  };

                  const locationQRData = createQRData(locationConfig);
                  const locationQRString = JSON.stringify(locationQRData);
                  const locationDataUrl = await generateQRCodeDataURL(locationQRString, request.options || {});

                  const locationFileName = `${branch.branchName}_${locationId}_${type}_${locationQRData.id.slice(0, 8)}.png`;
                  const locationFilePath = `${folderPath}/${locationFileName}`;

                  const locationBase64Data = locationDataUrl.split(',')[1];
                  const locationBinaryData = Uint8Array.from(atob(locationBase64Data), c => c.charCodeAt(0));

                  const { error: locationUploadError } = await supabase.storage
                    .from('attendance-assets')
                    .upload(locationFilePath, locationBinaryData, {
                      contentType: 'image/png',
                      upsert: true
                    });

                  if (!locationUploadError) {
                    const { data: locationUrlData } = supabase.storage
                      .from('attendance-assets')
                      .getPublicUrl(locationFilePath);

                    results.push({
                      qrData: locationQRData,
                      dataUrl: locationDataUrl,
                      imageUrl: locationUrlData.publicUrl,
                      filename: locationFileName,
                      storagePath: locationFilePath
                    });

                    // Store in database
                    await supabase
                      .from('qr_codes')
                      .insert({
                        id: locationQRData.id,
                        type: locationQRData.type,
                        branch_id: locationQRData.branchId,
                        branch_name: locationQRData.branchName,
                        location_id: locationQRData.locationId,
                        event_id: locationQRData.eventId,
                        created_at: locationQRData.createdAt.toISOString(),
                        expires_at: locationQRData.expiresAt?.toISOString(),
                        metadata: locationQRData.metadata,
                        signature: locationQRData.signature,
                        image_url: locationUrlData.publicUrl,
                        storage_path: locationFilePath
                      });
                  }
                }
              }
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              count: results.length,
              results
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        case 'validate': {
          const { qrString } = body;
          
          if (!qrString) {
            return new Response(
              JSON.stringify({ error: 'QR string required for validation' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          try {
            const qrData: QRCodeData = JSON.parse(qrString);
            
            // Convert date strings back to Date objects
            if (qrData.createdAt) {
              qrData.createdAt = new Date(qrData.createdAt);
            }
            if (qrData.expiresAt) {
              qrData.expiresAt = new Date(qrData.expiresAt);
            }

            const errors: string[] = [];

            // Check required fields
            if (!qrData.id) errors.push('Missing QR code ID');
            if (!qrData.type) errors.push('Missing QR code type');
            if (!qrData.branchId) errors.push('Missing branch ID');
            if (!qrData.branchName) errors.push('Missing branch name');
            if (!qrData.signature) errors.push('Missing signature');

            // Validate signature
            const expectedSignature = generateSignature({
              id: qrData.id,
              type: qrData.type,
              branchId: qrData.branchId,
              branchName: qrData.branchName,
              locationId: qrData.locationId,
              eventId: qrData.eventId,
              createdAt: qrData.createdAt,
              expiresAt: qrData.expiresAt,
              metadata: qrData.metadata
            });

            if (qrData.signature !== expectedSignature) {
              errors.push('Invalid signature - QR code may be tampered with');
            }

            // Check expiration
            const isExpired = qrData.expiresAt && new Date() > qrData.expiresAt;

            return new Response(
              JSON.stringify({
                isValid: errors.length === 0,
                errors,
                isExpired,
                qrData
              }),
              { 
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          } catch (parseError) {
            return new Response(
              JSON.stringify({
                isValid: false,
                errors: ['Invalid QR code format'],
                parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
              }),
              { 
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
        }

        default:
          return new Response(
            JSON.stringify({ error: 'Invalid action. Use: generate, batch, or validate' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
      }
    }

    if (req.method === 'GET') {
      const qrId = url.searchParams.get('id');
      
      if (!qrId) {
        // Return list of QR codes
        const { data, error } = await supabase
          .from('qr_codes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch QR codes', details: error.message }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        return new Response(
          JSON.stringify({ qrCodes: data }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } else {
        // Return specific QR code
        const { data, error } = await supabase
          .from('qr_codes')
          .select('*')
          .eq('id', qrId)
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: 'QR code not found', details: error.message }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        return new Response(
          JSON.stringify({ qrCode: data }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
});