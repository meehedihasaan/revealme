-- Create app settings table for general application configuration
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_name TEXT NOT NULL DEFAULT 'Reveal',
  app_logo_url TEXT,
  app_description TEXT DEFAULT 'A social media platform',
  primary_color TEXT DEFAULT '#007AFF',
  secondary_color TEXT DEFAULT '#5856EB',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only one settings record should exist
CREATE UNIQUE INDEX idx_app_settings_singleton ON public.app_settings ((1));

-- Insert default settings
INSERT INTO public.app_settings (app_name, app_description) VALUES ('Reveal', 'A social media platform');

-- RLS Policies
CREATE POLICY "App settings are viewable by everyone"
ON public.app_settings
FOR SELECT
USING (true);

CREATE POLICY "Only admins can update app settings"
ON public.app_settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();