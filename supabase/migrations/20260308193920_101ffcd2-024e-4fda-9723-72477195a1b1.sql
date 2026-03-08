
-- Tighten the insert policy: only allow inserts where actor_id matches the authenticated user
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Triggers can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_id);
