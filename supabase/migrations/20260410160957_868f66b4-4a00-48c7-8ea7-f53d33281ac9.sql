
-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_user_id UUID,
  reported_post_id UUID,
  reported_comment_id UUID,
  report_type TEXT NOT NULL DEFAULT 'post',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
ON public.reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON public.reports FOR SELECT TO authenticated
USING (reporter_id = auth.uid() OR has_admin_role(auth.uid()));

-- Admins can update reports (review/dismiss)
CREATE POLICY "Admins can update reports"
ON public.reports FOR UPDATE TO authenticated
USING (has_admin_role(auth.uid()))
WITH CHECK (has_admin_role(auth.uid()));

-- Admins can delete reports
CREATE POLICY "Admins can delete reports"
ON public.reports FOR DELETE TO authenticated
USING (has_admin_role(auth.uid()));

-- Allow admins/moderators to delete any post for moderation
CREATE POLICY "Admins can delete any post"
ON public.posts FOR DELETE TO authenticated
USING (auth.uid() = user_id OR can_manage_posts(auth.uid()));

-- Drop the old user-only delete policy and replace with combined
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
