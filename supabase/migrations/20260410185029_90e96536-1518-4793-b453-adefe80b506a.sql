ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'post';

-- Update RLS - no changes needed since existing policies cover all post types