import { useState, useEffect } from 'react';

const RECENT_REGIONS_KEY = 'recent-regions';
const MAX_RECENT = 10;

export interface RecentRegion {
  code: string;
  name: string;
  country: string;
  timestamp: number;
}

export const useRecentRegions = () => {
  const [recentRegions, setRecentRegions] = useState<RecentRegion[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_REGIONS_KEY);
      if (stored) {
        setRecentRegions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading recent regions:', error);
    }
  }, []);

  const addRecentRegion = (code: string, name: string, country: string) => {
    setRecentRegions((prev) => {
      // Remove if already exists
      const filtered = prev.filter(r => r.code !== code);
      
      // Add to front
      const updated = [
        { code, name, country, timestamp: Date.now() },
        ...filtered
      ].slice(0, MAX_RECENT);

      // Save to localStorage
      try {
        localStorage.setItem(RECENT_REGIONS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving recent regions:', error);
      }

      return updated;
    });
  };

  return {
    recentRegions,
    addRecentRegion
  };
};