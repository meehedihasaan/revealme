import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBannedWords() {
  return useQuery({
    queryKey: ['banned-words'],
    queryFn: async () => {
      const { data } = await supabase
        .from('banned_words')
        .select('word');
      return (data || []).map(d => d.word.toLowerCase());
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function containsBannedWord(text: string, bannedWords: string[]): boolean {
  const lower = text.toLowerCase();
  return bannedWords.some(word => lower.includes(word));
}
