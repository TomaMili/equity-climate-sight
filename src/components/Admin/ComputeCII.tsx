import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Calculator, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export function ComputeCII() {
  const [isComputing, setIsComputing] = useState(false);
  const [progress, setProgress] = useState({ computed: 0, total: 0, skipped: 0 });

  const handleComputeCII = async (year: number = 2024) => {
    try {
      setIsComputing(true);
      toast.info('Computing CII from real metrics...');
      
      const { data, error } = await supabase.functions.invoke('compute-cii', {
        body: { year }
      });

      if (error) {
        console.error('CII computation failed:', error);
        toast.error('CII computation failed. Please try again.');
        return;
      }

      setProgress({
        computed: data?.computed || 0,
        total: data?.total || 0,
        skipped: data?.skipped || 0
      });

      toast.success(`CII computed for ${data?.computed || 0} regions!`);
    } catch (error) {
      console.error('CII computation error:', error);
      toast.error('Failed to compute CII. Please try again.');
    } finally {
      setIsComputing(false);
    }
  };

  const percentage = progress.total > 0 
    ? Math.round((progress.computed / progress.total) * 100) 
    : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">CII Computation</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Recompute Climate Inequality Index from real metrics (climate risk, infrastructure, socioeconomic factors, air quality).
      </p>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Compute CII (2024)</span>
            <Button
              size="sm"
              onClick={() => handleComputeCII(2024)}
              disabled={isComputing}
            >
              {isComputing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Computing...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Compute CII
                </>
              )}
            </Button>
          </div>
        </div>

        {isComputing && progress.total > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-foreground font-medium">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
            
            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                <span>{progress.computed} computed</span>
              </div>
              {progress.skipped > 0 && (
                <div className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>{progress.skipped} skipped</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p className="font-medium">CII Formula Components:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Climate Risk (30%): Temperature, precipitation, drought/flood</li>
            <li>Infrastructure Gap (25%): Internet, services quality</li>
            <li>Socioeconomic Vulnerability (25%): GDP, urbanization</li>
            <li>Air Quality (20%): PM2.5, NO₂ levels</li>
          </ul>
          <p className="mt-2 text-amber-600 font-medium">
            ⚠️ Requires enriched data from World Bank, OpenAQ, NASA
          </p>
        </div>
      </div>
    </Card>
  );
}
