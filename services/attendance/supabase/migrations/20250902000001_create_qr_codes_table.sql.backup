-- Create QR codes table for storing generated QR code metadata
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('check-in', 'check-out', 'event', 'visitor')),
    branch_id TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    location_id TEXT,
    event_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    signature TEXT NOT NULL,
    image_url TEXT,
    storage_path TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    used_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_qr_codes_branch_id ON qr_codes(branch_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_type ON qr_codes(type);
CREATE INDEX IF NOT EXISTS idx_qr_codes_location_id ON qr_codes(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_codes_event_id ON qr_codes(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_codes_expires_at ON qr_codes(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_codes_is_active ON qr_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_qr_codes_created_at ON qr_codes(created_at);

-- Create partial index for active, non-expired QR codes
CREATE INDEX IF NOT EXISTS idx_qr_codes_active_valid ON qr_codes(branch_id, type, location_id) 
WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_qr_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_qr_codes_updated_at
    BEFORE UPDATE ON qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_codes_updated_at();

-- Create QR code usage log table for tracking scans
CREATE TABLE IF NOT EXISTS qr_code_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    user_id UUID,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    scan_location JSONB, -- lat/lng coordinates
    scan_result TEXT NOT NULL CHECK (scan_result IN ('success', 'expired', 'invalid', 'error')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for scan log
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_qr_code_id ON qr_code_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_user_id ON qr_code_scans(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_scanned_at ON qr_code_scans(scanned_at);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_result ON qr_code_scans(scan_result);

-- Create function to increment QR code usage count
CREATE OR REPLACE FUNCTION increment_qr_code_usage(qr_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE qr_codes 
    SET 
        used_count = used_count + 1,
        last_used_at = NOW(),
        updated_at = NOW()
    WHERE id = qr_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get QR code statistics
CREATE OR REPLACE FUNCTION get_qr_code_stats(branch_filter TEXT DEFAULT NULL)
RETURNS TABLE (
    total_qr_codes BIGINT,
    active_qr_codes BIGINT,
    expired_qr_codes BIGINT,
    total_scans BIGINT,
    successful_scans BIGINT,
    failed_scans BIGINT,
    most_used_qr_id UUID,
    most_used_qr_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH qr_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE is_active = TRUE) as active,
            COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at <= NOW()) as expired
        FROM qr_codes
        WHERE branch_filter IS NULL OR branch_id = branch_filter
    ),
    scan_stats AS (
        SELECT 
            COUNT(*) as total_scans,
            COUNT(*) FILTER (WHERE scan_result = 'success') as success_scans,
            COUNT(*) FILTER (WHERE scan_result != 'success') as failed_scans
        FROM qr_code_scans qcs
        JOIN qr_codes qc ON qcs.qr_code_id = qc.id
        WHERE branch_filter IS NULL OR qc.branch_id = branch_filter
    ),
    most_used AS (
        SELECT id, used_count
        FROM qr_codes
        WHERE branch_filter IS NULL OR branch_id = branch_filter
        ORDER BY used_count DESC
        LIMIT 1
    )
    SELECT 
        qs.total,
        qs.active,
        qs.expired,
        COALESCE(ss.total_scans, 0),
        COALESCE(ss.success_scans, 0),
        COALESCE(ss.failed_scans, 0),
        mu.id,
        COALESCE(mu.used_count, 0)
    FROM qr_stats qs
    CROSS JOIN scan_stats ss
    LEFT JOIN most_used mu ON TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create view for active QR codes with scan counts
CREATE OR REPLACE VIEW active_qr_codes_with_stats AS
SELECT 
    qc.*,
    COALESCE(scan_counts.total_scans, 0) as total_scans,
    COALESCE(scan_counts.successful_scans, 0) as successful_scans,
    COALESCE(scan_counts.failed_scans, 0) as failed_scans,
    COALESCE(scan_counts.recent_scans, 0) as recent_scans_24h,
    CASE 
        WHEN qc.expires_at IS NOT NULL AND qc.expires_at <= NOW() THEN 'expired'
        WHEN qc.is_active = FALSE THEN 'inactive'
        ELSE 'active'
    END as status
FROM qr_codes qc
LEFT JOIN (
    SELECT 
        qr_code_id,
        COUNT(*) as total_scans,
        COUNT(*) FILTER (WHERE scan_result = 'success') as successful_scans,
        COUNT(*) FILTER (WHERE scan_result != 'success') as failed_scans,
        COUNT(*) FILTER (WHERE scanned_at > NOW() - INTERVAL '24 hours') as recent_scans
    FROM qr_code_scans
    GROUP BY qr_code_id
) scan_counts ON qc.id = scan_counts.qr_code_id;

-- Create RLS (Row Level Security) policies if needed
-- ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE qr_code_scans ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE qr_codes IS 'Storage for generated QR codes with metadata and tracking information';
COMMENT ON TABLE qr_code_scans IS 'Log of QR code scan events for analytics and security';
COMMENT ON FUNCTION increment_qr_code_usage(UUID) IS 'Increments the usage count for a QR code when scanned';
COMMENT ON FUNCTION get_qr_code_stats(TEXT) IS 'Returns comprehensive statistics for QR codes, optionally filtered by branch';
COMMENT ON VIEW active_qr_codes_with_stats IS 'Active QR codes with computed scan statistics and status';