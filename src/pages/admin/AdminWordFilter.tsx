import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, X, Filter } from "lucide-react";
import { toast } from "sonner";

export default function AdminWordFilter() {
  const queryClient = useQueryClient();
  const [newWord, setNewWord] = useState('');

  const { data: words, isLoading } = useQuery({
    queryKey: ['banned-words-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('banned_words').select('*').order('word');
      if (error) throw error;
      return data;
    },
  });

  const addWord = useMutation({
    mutationFn: async (word: string) => {
      const { error } = await supabase.from('banned_words').insert({ word: word.toLowerCase().trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Word added to filter");
      queryClient.invalidateQueries({ queryKey: ['banned-words-admin'] });
      queryClient.invalidateQueries({ queryKey: ['banned-words'] });
      setNewWord('');
    },
    onError: (e: any) => toast.error(e.message?.includes('duplicate') ? 'Word already exists' : 'Failed to add word'),
  });

  const removeWord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('banned_words').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Word removed");
      queryClient.invalidateQueries({ queryKey: ['banned-words-admin'] });
      queryClient.invalidateQueries({ queryKey: ['banned-words'] });
    },
    onError: () => toast.error("Failed to remove"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Word Filter</h2>
        <p className="text-sm text-muted-foreground">Manage restricted words for usernames and display names.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              value={newWord}
              onChange={e => setNewWord(e.target.value)}
              placeholder="Add restricted word..."
              onKeyDown={e => e.key === 'Enter' && newWord.trim() && addWord.mutate(newWord)}
            />
            <Button
              onClick={() => newWord.trim() && addWord.mutate(newWord)}
              disabled={!newWord.trim() || addWord.isPending}
              className="gap-1 shrink-0"
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{words?.length || 0} restricted words</span>
          </div>
          {isLoading && <Skeleton className="h-20 w-full" />}
          <div className="flex flex-wrap gap-2">
            {words?.map(w => (
              <Badge key={w.id} variant="secondary" className="gap-1 pr-1 text-sm">
                {w.word}
                <button
                  onClick={() => removeWord.mutate(w.id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-foreground/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {!isLoading && (!words || words.length === 0) && (
              <p className="text-sm text-muted-foreground">No restricted words yet. Add words that users can't use in usernames or names.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
