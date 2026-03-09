import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Settings, Palette, Type } from "lucide-react";
import { toast } from "sonner";

type AppSettings = {
  id: string;
  app_name: string;
  app_logo_url: string | null;
  app_description: string | null;
  primary_color: string;
  secondary_color: string;
  updated_at: string;
};

export default function AdminAppSettings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<AppSettings>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data as AppSettings;
    },
    onSuccess: (data) => {
      setFormData(data);
    }
  });

  const updateSettings = useMutation({
    mutationFn: async (updatedSettings: Partial<AppSettings>) => {
      const { error } = await supabase
        .from('app_settings')
        .update(updatedSettings)
        .eq('id', settings?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("App settings updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update settings");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(formData);
  };

  const handleInputChange = (field: keyof AppSettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">App Settings</h2>
          <p className="text-muted-foreground">Configure your application's general settings.</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">App Settings</h2>
        <p className="text-muted-foreground">Configure your application's general settings and branding.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="app_name">App Name</Label>
              <Input
                id="app_name"
                value={formData.app_name || ''}
                onChange={(e) => handleInputChange('app_name', e.target.value)}
                placeholder="Enter app name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="app_description">App Description</Label>
              <Textarea
                id="app_description"
                value={formData.app_description || ''}
                onChange={(e) => handleInputChange('app_description', e.target.value)}
                placeholder="Describe your application"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="app_logo_url">Logo URL</Label>
              <Input
                id="app_logo_url"
                type="url"
                value={formData.app_logo_url || ''}
                onChange={(e) => handleInputChange('app_logo_url', e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">
                Enter a URL to your app's logo image.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme & Colors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    type="color"
                    value={formData.primary_color || '#007AFF'}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={formData.primary_color || '#007AFF'}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                    placeholder="#007AFF"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_color">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary_color"
                    type="color"
                    value={formData.secondary_color || '#5856EB'}
                    onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={formData.secondary_color || '#5856EB'}
                    onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                    placeholder="#5856EB"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Last updated: {settings ? new Date(settings.updated_at).toLocaleDateString() : 'Never'}
                </p>
              </div>
              <Button
                type="submit"
                disabled={updateSettings.isPending}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}