
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  type TEXT NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_text TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: on like
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE post_owner UUID;
BEGIN
  SELECT user_id INTO post_owner FROM public.posts WHERE id = NEW.post_id;
  IF post_owner IS NOT NULL AND post_owner != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id) VALUES (post_owner, NEW.user_id, 'like', NEW.post_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_like_notify AFTER INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- Trigger: on comment
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE post_owner UUID;
BEGIN
  SELECT user_id INTO post_owner FROM public.posts WHERE id = NEW.post_id;
  IF post_owner IS NOT NULL AND post_owner != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment_text) VALUES (post_owner, NEW.user_id, 'comment', NEW.post_id, LEFT(NEW.text, 100));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_comment_notify AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- Trigger: on follow
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.following_id != NEW.follower_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type) VALUES (NEW.following_id, NEW.follower_id, 'follow');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_follow_notify AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();
