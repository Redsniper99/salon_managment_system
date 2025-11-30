-- =====================================================
-- SCHEDULING HELPER FUNCTIONS
-- Securely fetch appointment times without exposing customer data
-- =====================================================

-- Function to get appointment times for a stylist on a specific date
-- SECURITY DEFINER: Runs with privileges of the creator (bypassing RLS)
CREATE OR REPLACE FUNCTION get_stylist_appointments_for_scheduling(
  p_stylist_id UUID,
  p_date DATE
)
RETURNS TABLE (
  start_time TIME,
  duration INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    appointments.start_time, 
    appointments.duration
  FROM 
    appointments
  WHERE 
    appointments.stylist_id = p_stylist_id
    AND appointments.appointment_date = p_date
    AND appointments.status IN ('Pending', 'Confirmed', 'InService');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_stylist_appointments_for_scheduling(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stylist_appointments_for_scheduling(UUID, DATE) TO anon;

COMMENT ON FUNCTION get_stylist_appointments_for_scheduling IS 'Securely fetches appointment times for scheduling availability checks';
