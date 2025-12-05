-- Check the actual structure of glucose_readings table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'app_adf262f319_glucose_readings'
ORDER BY ordinal_position;
