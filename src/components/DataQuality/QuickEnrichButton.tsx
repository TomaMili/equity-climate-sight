import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface QuickEnrichButtonProps {
  regionCode: string;
  regionName: string;
  year: number;
  onEnrichComplete?: () => void;
  size?: 'sm' | 'default' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
  showLabel?: boolean;
}

export function QuickEnrichButton({
  regionCode,
  regionName,
  year,
  onEnrichComplete,
  size = 'sm',
  variant = 'outline',
  showLabel = false
}: QuickEnrichButtonProps) {
  const [isEnriching, setIsEnriching] = useState(false);
  const [enriched, setEnriched] = useState(false);

  const handleEnrich = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click events
    
    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-single-region', {
        body: { region_code: regionCode, year }
      });

      if (error) throw error;

      if (data?.success) {
        setEnriched(true);
        toast.success(`${regionName} enriched successfully!`, {
          description: `Updated with data from ${data.sources?.join(', ') || 'external sources'}`
        });
        
        // Reset enriched state after 3 seconds
        setTimeout(() => setEnriched(false), 3000);
        
        // Notify parent component
        onEnrichComplete?.();
      } else {
        toast.warning(`Limited data available for ${regionName}`, {
          description: data?.message || 'Some external sources may not have data for this region'
        });
      }
    } catch (error: any) {
      console.error('Enrichment error:', error);
      toast.error('Failed to enrich region', {
        description: error.message || 'Please try again or use bulk enrichment from Admin panel'
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={handleEnrich}
      disabled={isEnriching || enriched}
      className={enriched ? 'border-green-500 text-green-600' : ''}
    >
      {enriched ? (
        <>
          <Check className="h-3.5 w-3.5" />
          {showLabel && <span className="ml-1">Enriched</span>}
        </>
      ) : (
        <>
          <RefreshCw className={`h-3.5 w-3.5 ${isEnriching ? 'animate-spin' : ''}`} />
          {showLabel && <span className="ml-1">{isEnriching ? 'Enriching...' : 'Enrich'}</span>}
        </>
      )}
    </Button>
  );

  if (!showLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Fetch real data for this region</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
