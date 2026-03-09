-- Update the follow notification trigger to prevent duplicates
-- First drop the existing trigger
DROP TRIGGER IF EXISTS follow_notifications ON public.follows;

-- Update the function to check for existing recent follow notifications
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only create notification if user is following someone else
  IF NEW.following_id != NEW.follower_id THEN
    -- Check if there's already a follow notification from this user in the last 24 hours
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.following_id 
        AND actor_id = NEW.follower_id 
        AND type = 'follow'
        AND created_at > NOW() - INTERVAL '24 hours'
    ) THEN
      INSERT INTO public.notifications (user_id, actor_id, type) 
      VALUES (NEW.following_id, NEW.follower_id, 'follow');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;