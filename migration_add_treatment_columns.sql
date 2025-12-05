-- Migration: Add treatment columns to insulin_logs table
-- This allows the table to support both insulin and pills tracking

BEGIN;

-- Add new columns to support treatment types beyond insulin
ALTER TABLE app_adf262f319_insulin_logs
ADD COLUMN IF NOT EXISTS treatment_type TEXT DEFAULT 'insulin' CHECK (treatment_type IN ('insulin', 'pills')),
ADD COLUMN IF NOT EXISTS medication_name TEXT,
ADD COLUMN IF NOT EXISTS dose_unit TEXT DEFAULT 'units';

-- Update existing records to have the default values
UPDATE app_adf262f319_insulin_logs
SET treatment_type = 'insulin',
    dose_unit = 'units'
WHERE treatment_type IS NULL OR dose_unit IS NULL;

-- Make treatment_type NOT NULL after setting defaults
ALTER TABLE app_adf262f319_insulin_logs
ALTER COLUMN treatment_type SET NOT NULL,
ALTER COLUMN dose_unit SET NOT NULL;

-- Add comment to document the table's expanded purpose
COMMENT ON TABLE app_adf262f319_insulin_logs IS 'Stores treatment logs including insulin injections and oral medications';

COMMIT;