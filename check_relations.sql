-- Check all care relations
SELECT 
  id,
  caregiver_id,
  patient_id,
  relation_type,
  created_at
FROM app_adf262f319_care_relations
ORDER BY created_at DESC;
