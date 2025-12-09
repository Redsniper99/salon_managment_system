-- =====================================================
-- FIX RPC PERMISSIONS FOR SEGMENTATION
-- =====================================================

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION refresh_segment_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION update_customer_stats(UUID) TO authenticated;

-- Also grant to anon role (if you need public access)
GRANT EXECUTE ON FUNCTION refresh_segment_counts() TO anon;
GRANT EXECUTE ON FUNCTION update_customer_stats(UUID) TO anon;

-- Test it
SELECT refresh_segment_counts();

-- Verify the grants
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_name IN ('refresh_segment_counts', 'update_customer_stats');
