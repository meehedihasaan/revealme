-- Recreate the trigger
CREATE TRIGGER follow_notifications
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_follow();