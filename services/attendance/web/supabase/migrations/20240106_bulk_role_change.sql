-- Create role change lock table for preventing concurrent changes
CREATE TABLE IF NOT EXISTS role_change_locks (
  user_id UUID PRIMARY KEY,
  locked_by UUID NOT NULL REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT valid_lock_duration CHECK (expires_at > locked_at)
);

-- Create index for lock expiration queries
CREATE INDEX idx_role_change_locks_expires ON role_change_locks(expires_at);

-- Create role change history table for rollback capability
CREATE TABLE IF NOT EXISTS role_change_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  old_role TEXT NOT NULL,
  new_role TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  batch_id UUID,
  rolled_back BOOLEAN DEFAULT FALSE,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID REFERENCES auth.users(id)
);

-- Create indexes for history queries
CREATE INDEX idx_role_change_history_user ON role_change_history(user_id, changed_at DESC);
CREATE INDEX idx_role_change_history_batch ON role_change_history(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_role_change_history_rollback ON role_change_history(changed_at) WHERE NOT rolled_back;

-- Function to acquire role change lock
CREATE OR REPLACE FUNCTION acquire_role_change_lock(
  user_ids UUID[],
  lock_duration_seconds INTEGER DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  lock_expiry TIMESTAMPTZ;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Calculate lock expiry
  lock_expiry := NOW() + (lock_duration_seconds || ' seconds')::INTERVAL;

  -- Clean up expired locks
  DELETE FROM role_change_locks WHERE expires_at < NOW();

  -- Try to acquire locks for all users
  BEGIN
    -- Check if any user is already locked
    IF EXISTS (
      SELECT 1 FROM role_change_locks 
      WHERE user_id = ANY(user_ids) 
      AND expires_at > NOW()
    ) THEN
      RETURN FALSE;
    END IF;

    -- Insert locks for all users
    INSERT INTO role_change_locks (user_id, locked_by, expires_at)
    SELECT unnest(user_ids), current_user_id, lock_expiry;

    RETURN TRUE;
  EXCEPTION
    WHEN unique_violation THEN
      -- Lock already exists
      RETURN FALSE;
    WHEN OTHERS THEN
      -- Any other error
      RETURN FALSE;
  END;
END;
$$;

-- Function to release role change lock
CREATE OR REPLACE FUNCTION release_role_change_lock(user_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM role_change_locks 
  WHERE user_id = ANY(user_ids) 
  AND locked_by = auth.uid();
END;
$$;

-- Function to perform bulk role update with transaction
CREATE OR REPLACE FUNCTION bulk_update_roles(
  changes JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  change_record RECORD;
  batch_id UUID;
  result JSONB;
  processed JSONB;
  current_user_id UUID;
  current_user_role TEXT;
  success_count INTEGER := 0;
  fail_count INTEGER := 0;
BEGIN
  -- Get current user and verify permissions
  current_user_id := auth.uid();
  
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = current_user_id;

  IF current_user_role NOT IN ('ADMIN', 'MASTER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions for role changes';
  END IF;

  -- Generate batch ID for this operation
  batch_id := gen_random_uuid();
  processed := '{}'::JSONB;

  -- Start transaction
  BEGIN
    -- Process each change
    FOR change_record IN SELECT * FROM jsonb_array_elements(changes) LOOP
      DECLARE
        user_id UUID;
        old_role TEXT;
        new_role TEXT;
        change_reason TEXT;
      BEGIN
        user_id := (change_record.value->>'user_id')::UUID;
        old_role := change_record.value->>'old_role';
        new_role := change_record.value->>'new_role';
        change_reason := change_record.value->>'reason';

        -- Validate role hierarchy
        IF current_user_role = 'ADMIN' AND new_role = 'MASTER_ADMIN' THEN
          processed := processed || jsonb_build_object(
            user_id::TEXT, jsonb_build_object(
              'success', false,
              'error', 'Cannot assign MASTER_ADMIN role'
            )
          );
          fail_count := fail_count + 1;
          CONTINUE;
        END IF;

        -- Check if user exists and current role matches
        IF NOT EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = user_id AND role = old_role
        ) THEN
          processed := processed || jsonb_build_object(
            user_id::TEXT, jsonb_build_object(
              'success', false,
              'error', 'User not found or role mismatch'
            )
          );
          fail_count := fail_count + 1;
          CONTINUE;
        END IF;

        -- Prevent removing last MASTER_ADMIN
        IF old_role = 'MASTER_ADMIN' AND new_role != 'MASTER_ADMIN' THEN
          IF (SELECT COUNT(*) FROM profiles WHERE role = 'MASTER_ADMIN') <= 1 THEN
            processed := processed || jsonb_build_object(
              user_id::TEXT, jsonb_build_object(
                'success', false,
                'error', 'Cannot remove last MASTER_ADMIN'
              )
            );
            fail_count := fail_count + 1;
            CONTINUE;
          END IF;
        END IF;

        -- Update the role
        UPDATE profiles
        SET 
          role = new_role,
          updated_at = NOW()
        WHERE id = user_id;

        -- Record in history
        INSERT INTO role_change_history (
          user_id, old_role, new_role, changed_by, reason, batch_id
        ) VALUES (
          user_id, old_role, new_role, current_user_id, change_reason, batch_id
        );

        -- Add to processed
        processed := processed || jsonb_build_object(
          user_id::TEXT, jsonb_build_object('success', true)
        );
        success_count := success_count + 1;

      EXCEPTION
        WHEN OTHERS THEN
          -- Record failure
          processed := processed || jsonb_build_object(
            user_id::TEXT, jsonb_build_object(
              'success', false,
              'error', SQLERRM
            )
          );
          fail_count := fail_count + 1;
      END;
    END LOOP;

    -- If all failed, rollback
    IF success_count = 0 AND fail_count > 0 THEN
      RAISE EXCEPTION 'All role changes failed';
    END IF;

    -- Build result
    result := jsonb_build_object(
      'batch_id', batch_id,
      'successful', success_count,
      'failed', fail_count,
      'processed', processed
    );

    RETURN result;

  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RAISE;
  END;
END;
$$;

-- Function to rollback role changes
CREATE OR REPLACE FUNCTION rollback_role_changes(
  user_ids UUID[],
  rollback_window_minutes INTEGER DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  change_record RECORD;
  rollback_count INTEGER := 0;
BEGIN
  current_user_id := auth.uid();

  -- Rollback recent changes for specified users
  FOR change_record IN 
    SELECT DISTINCT ON (user_id) 
      user_id, old_role, new_role, batch_id
    FROM role_change_history
    WHERE 
      user_id = ANY(user_ids)
      AND changed_at > NOW() - (rollback_window_minutes || ' minutes')::INTERVAL
      AND NOT rolled_back
      AND changed_by = current_user_id  -- Can only rollback own changes
    ORDER BY user_id, changed_at DESC
  LOOP
    -- Restore old role
    UPDATE profiles
    SET role = change_record.old_role
    WHERE id = change_record.user_id;

    -- Mark as rolled back
    UPDATE role_change_history
    SET 
      rolled_back = TRUE,
      rolled_back_at = NOW(),
      rolled_back_by = current_user_id
    WHERE 
      user_id = change_record.user_id
      AND batch_id = change_record.batch_id;

    rollback_count := rollback_count + 1;
  END LOOP;

  RETURN rollback_count > 0;
END;
$$;

-- Function to detect suspicious role change patterns
CREATE OR REPLACE FUNCTION check_role_change_patterns(
  user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_changes INTEGER;
  rapid_escalations INTEGER;
  result JSONB;
BEGIN
  -- Count recent changes (last hour)
  SELECT COUNT(*) INTO recent_changes
  FROM role_change_history
  WHERE changed_by = user_id
  AND changed_at > NOW() - INTERVAL '1 hour';

  -- Count rapid privilege escalations
  SELECT COUNT(*) INTO rapid_escalations
  FROM role_change_history
  WHERE changed_by = user_id
  AND changed_at > NOW() - INTERVAL '10 minutes'
  AND new_role IN ('ADMIN', 'MASTER_ADMIN');

  result := jsonb_build_object(
    'recent_changes', recent_changes,
    'rapid_escalations', rapid_escalations,
    'suspicious', (recent_changes > 20 OR rapid_escalations > 5)
  );

  RETURN result;
END;
$$;

-- Create RLS policies
ALTER TABLE role_change_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_change_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view locks
CREATE POLICY "Admins can view locks" ON role_change_locks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'MASTER_ADMIN')
    )
  );

-- Admins can view role change history
CREATE POLICY "Admins can view role history" ON role_change_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'MASTER_ADMIN')
    )
  );

-- Users can view their own role change history
CREATE POLICY "Users can view own role history" ON role_change_history
  FOR SELECT
  USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION acquire_role_change_lock TO authenticated;
GRANT EXECUTE ON FUNCTION release_role_change_lock TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_roles TO authenticated;
GRANT EXECUTE ON FUNCTION rollback_role_changes TO authenticated;
GRANT EXECUTE ON FUNCTION check_role_change_patterns TO authenticated;