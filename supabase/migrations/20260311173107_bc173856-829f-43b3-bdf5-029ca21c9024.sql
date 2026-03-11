
-- Create restricted_users table
CREATE TABLE public.restricted_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restrictor_id uuid NOT NULL,
  restricted_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (restrictor_id, restricted_id)
);

-- Enable RLS
ALTER TABLE public.restricted_users ENABLE ROW LEVEL SECURITY;

-- Users can restrict others
CREATE POLICY "Users can restrict others"
ON public.restricted_users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = restrictor_id);

-- Users can view their restrictions
CREATE POLICY "Users can view their restrictions"
ON public.restricted_users FOR SELECT
TO authenticated
USING (auth.uid() = restrictor_id OR auth.uid() = restricted_id);

-- Users can unrestrict
CREATE POLICY "Users can unrestrict"
ON public.restricted_users FOR DELETE
TO authenticated
USING (auth.uid() = restrictor_id);
