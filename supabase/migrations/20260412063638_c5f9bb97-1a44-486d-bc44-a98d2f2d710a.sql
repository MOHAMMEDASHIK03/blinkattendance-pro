
-- Allow anyone to delete attendance records (admin check is done in the app)
CREATE POLICY "Anyone can delete attendance"
ON public.attendance_records FOR DELETE
USING (true);
