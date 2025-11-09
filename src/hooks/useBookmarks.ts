import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Generate a session ID for this browser
const getSessionId = () => {
  let sessionId = localStorage.getItem('user-session-id');
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    localStorage.setItem('user-session-id', sessionId);
  }
  return sessionId;
};

export const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const { toast } = useToast();
  const sessionId = getSessionId();

  // Load bookmarks on mount
  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const { data, error } = await supabase
        .from('region_bookmarks')
        .select('region_code')
        .eq('user_session_id', sessionId);

      if (error) throw error;
      setBookmarks(data?.map(b => b.region_code) || []);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };

  const toggleBookmark = async (regionCode: string) => {
    try {
      if (bookmarks.includes(regionCode)) {
        // Remove bookmark
        const { error } = await supabase
          .from('region_bookmarks')
          .delete()
          .eq('user_session_id', sessionId)
          .eq('region_code', regionCode);

        if (error) throw error;
        setBookmarks(bookmarks.filter(b => b !== regionCode));
        toast({
          title: 'Bookmark Removed',
          description: 'Region removed from bookmarks',
        });
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('region_bookmarks')
          .insert({
            user_session_id: sessionId,
            region_code: regionCode
          });

        if (error) throw error;
        setBookmarks([...bookmarks, regionCode]);
        toast({
          title: 'Bookmark Added',
          description: 'Region added to bookmarks',
        });
      }
    } catch (error: any) {
      console.error('Error toggling bookmark:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update bookmark',
        variant: 'destructive',
      });
    }
  };

  const isBookmarked = (regionCode: string) => bookmarks.includes(regionCode);

  return {
    bookmarks,
    toggleBookmark,
    isBookmarked
  };
};