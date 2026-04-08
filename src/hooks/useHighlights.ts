import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Highlight = {
  id: string;
  user_id: string;
  title: string;
  cover_image_url: string | null;
  display_order: number;
  created_at: string;
  items?: HighlightItem[];
};

export type HighlightItem = {
  id: string;
  highlight_id: string;
  image_url: string;
  story_id: string | null;
  display_order: number;
  created_at: string;
};

export function useHighlights(userId?: string) {
  return useQuery({
    queryKey: ['highlights', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('highlights')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });
      if (error) throw error;

      // Fetch items for each highlight
      const highlightIds = (data || []).map(h => h.id);
      if (highlightIds.length === 0) return data as Highlight[];

      const { data: items } = await supabase
        .from('highlight_items')
        .select('*')
        .in('highlight_id', highlightIds)
        .order('display_order', { ascending: true });

      return (data || []).map(h => ({
        ...h,
        items: (items || []).filter(i => i.highlight_id === h.id),
      })) as Highlight[];
    },
    enabled: !!userId,
  });
}

export function useCreateHighlight() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ title, coverUrl, imageUrls }: { title: string; coverUrl?: string; imageUrls: string[] }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: highlight, error } = await supabase
        .from('highlights')
        .insert({
          user_id: user.id,
          title,
          cover_image_url: coverUrl || imageUrls[0] || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert items
      if (imageUrls.length > 0) {
        const items = imageUrls.map((url, i) => ({
          highlight_id: highlight.id,
          image_url: url,
          display_order: i,
        }));
        await supabase.from('highlight_items').insert(items);
      }

      return highlight;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights'] });
    },
  });
}

export function useDeleteHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (highlightId: string) => {
      const { error } = await supabase.from('highlights').delete().eq('id', highlightId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights'] });
    },
  });
}

export function useAddHighlightItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ highlightId, imageUrl, storyId }: { highlightId: string; imageUrl: string; storyId?: string }) => {
      const { error } = await supabase.from('highlight_items').insert({
        highlight_id: highlightId,
        image_url: imageUrl,
        story_id: storyId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights'] });
    },
  });
}
