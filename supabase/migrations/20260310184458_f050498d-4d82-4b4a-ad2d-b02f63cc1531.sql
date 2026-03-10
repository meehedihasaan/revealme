ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS latitude double precision DEFAULT NULL,
ADD COLUMN IF NOT EXISTS longitude double precision DEFAULT NULL,
ADD COLUMN IF NOT EXISTS show_on_map boolean NOT NULL DEFAULT false;