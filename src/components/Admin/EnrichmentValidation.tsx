import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, AlertCircle, Clock, Database, Key, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ValidationResult {
  hasOpenAQKey: boolean;
  countriesNeedingEnrichment: number;
  regionsNeedingEnrichment: number;
  estimatedTimeMinutes: number;
  rateLimitStatus: 'ok' | 'warning' | 'error';
  warnings: string[];
  errors: string[];
}

interface EnrichmentValidationProps {
  onProceed: () => void;
  onCancel: () => void;
  enrichmentType: 'all' | 'countries' | 'regions';
  parallelWorkers: number;
}

export function EnrichmentValidation({ 
  onProceed, 
  onCancel, 
  enrichmentType,
  parallelWorkers 
}: EnrichmentValidationProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    validateEnrichment();
  }, [enrichmentType, parallelWorkers]);

  const validateEnrichment = async () => {
    setLoading(true);
    
    const result: ValidationResult = {
      hasOpenAQKey: false,
      countriesNeedingEnrichment: 0,
      regionsNeedingEnrichment: 0,
      estimatedTimeMinutes: 0,
      rateLimitStatus: 'ok',
      warnings: [],
      errors: []
    };

    try {
      // Check if OpenAQ API key is set by testing the function
      try {
        const { error } = await supabase.functions.invoke('fetch-openaq-data', {
          body: { country_codes: ['US'] }
        });
        
        // If no error or specific error types, key is likely set
        if (!error || !error.message?.includes('OPENAQ_API_KEY')) {
          result.hasOpenAQKey = true;
        } else {
          result.errors.push('OpenAQ API key not configured');
        }
      } catch (err: any) {
        if (!err.message?.includes('OPENAQ_API_KEY')) {
          result.hasOpenAQKey = true;
        } else {
          result.errors.push('OpenAQ API key not configured');
        }
      }

      // Count countries needing enrichment
      const { count: countriesCount } = await supabase
        .from('climate_inequality_regions')
        .select('*', { count: 'exact', head: true })
        .eq('region_type', 'country')
        .eq('data_year', 2024)
        .contains('data_sources', ['Synthetic']);

      result.countriesNeedingEnrichment = countriesCount || 0;

      // Count regions needing enrichment
      const { count: regionsCount } = await supabase
        .from('climate_inequality_regions')
        .select('*', { count: 'exact', head: true })
        .eq('region_type', 'region')
        .eq('data_year', 2024)
        .contains('data_sources', ['Synthetic']);

      result.regionsNeedingEnrichment = regionsCount || 0;

      // Estimate completion time
      const SECONDS_PER_COUNTRY = 15; // ~15s per country (World Bank + OpenAQ + NASA)
      const SECONDS_PER_REGION_WORKER = 6; // ~6s per region per worker
      
      let totalSeconds = 0;
      
      if (enrichmentType === 'all' || enrichmentType === 'countries') {
        totalSeconds += result.countriesNeedingEnrichment * SECONDS_PER_COUNTRY;
      }
      
      if (enrichmentType === 'all' || enrichmentType === 'regions') {
        // Parallel processing for regions
        const regionBatches = Math.ceil(result.regionsNeedingEnrichment / parallelWorkers);
        totalSeconds += regionBatches * SECONDS_PER_REGION_WORKER;
      }
      
      result.estimatedTimeMinutes = Math.ceil(totalSeconds / 60);

      // Rate limit status
      const totalItems = result.countriesNeedingEnrichment + result.regionsNeedingEnrichment;
      
      if (totalItems > 5000) {
        result.rateLimitStatus = 'error';
        result.errors.push('Large dataset may exceed API rate limits. Consider enriching in smaller batches.');
      } else if (totalItems > 2000) {
        result.rateLimitStatus = 'warning';
        result.warnings.push('Medium dataset size. Monitor for rate limit warnings during enrichment.');
      } else {
        result.rateLimitStatus = 'ok';
      }

      // Additional warnings
      if (!result.hasOpenAQKey) {
        result.warnings.push('Air quality data (PM2.5, NO2) will not be enriched without OpenAQ API key');
      }

      if (result.countriesNeedingEnrichment === 0 && result.regionsNeedingEnrichment === 0) {
        result.warnings.push('All data is already enriched for 2024');
      }

      setValidation(result);
    } catch (error) {
      console.error('Validation error:', error);
      result.errors.push('Failed to validate enrichment prerequisites');
      setValidation(result);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !validation) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2">
          <Clock className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Validating enrichment readiness...</span>
        </div>
      </Card>
    );
  }

  const canProceed = validation.errors.length === 0;
  const totalToEnrich = 
    (enrichmentType === 'all' || enrichmentType === 'countries' ? validation.countriesNeedingEnrichment : 0) +
    (enrichmentType === 'all' || enrichmentType === 'regions' ? validation.regionsNeedingEnrichment : 0);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Enrichment Pre-Flight Check</h3>
      </div>

      {/* API Key Status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 rounded-lg border border-border/40">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">OpenAQ API Key</span>
          </div>
          {validation.hasOpenAQKey ? (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">Configured</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Missing</span>
            </div>
          )}
        </div>
      </div>

      {/* Data Volume */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Data to Enrich (2024)</h4>
        <div className="grid grid-cols-2 gap-2">
          {(enrichmentType === 'all' || enrichmentType === 'countries') && (
            <div className="p-3 rounded-lg border border-border/40">
              <div className="text-xs text-muted-foreground">Countries</div>
              <div className="text-lg font-semibold text-foreground">{validation.countriesNeedingEnrichment}</div>
            </div>
          )}
          {(enrichmentType === 'all' || enrichmentType === 'regions') && (
            <div className="p-3 rounded-lg border border-border/40">
              <div className="text-xs text-muted-foreground">Regions</div>
              <div className="text-lg font-semibold text-foreground">{validation.regionsNeedingEnrichment}</div>
            </div>
          )}
        </div>
      </div>

      {/* Time Estimate */}
      <div className="p-3 rounded-lg border border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Estimated Time</span>
          </div>
          <span className="text-sm font-semibold text-foreground">
            ~{validation.estimatedTimeMinutes} {validation.estimatedTimeMinutes === 1 ? 'minute' : 'minutes'}
          </span>
        </div>
        {enrichmentType === 'regions' && (
          <p className="text-xs text-muted-foreground mt-1">
            Using {parallelWorkers} parallel workers for faster processing
          </p>
        )}
      </div>

      {/* Rate Limit Status */}
      <div className={`p-3 rounded-lg border ${
        validation.rateLimitStatus === 'ok' ? 'border-green-600/40 bg-green-600/5' :
        validation.rateLimitStatus === 'warning' ? 'border-orange-600/40 bg-orange-600/5' :
        'border-destructive/40 bg-destructive/5'
      }`}>
        <div className="flex items-center gap-2">
          <Zap className={`h-4 w-4 ${
            validation.rateLimitStatus === 'ok' ? 'text-green-600' :
            validation.rateLimitStatus === 'warning' ? 'text-orange-600' :
            'text-destructive'
          }`} />
          <span className="text-sm font-medium">Rate Limit Status</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {validation.rateLimitStatus === 'ok' && 'All systems ready for enrichment'}
          {validation.rateLimitStatus === 'warning' && 'Proceed with caution - may hit rate limits'}
          {validation.rateLimitStatus === 'error' && 'High risk of rate limiting - reduce batch size'}
        </p>
      </div>

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs space-y-1">
            {validation.warnings.map((warning, idx) => (
              <div key={idx}>• {warning}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Errors */}
      {validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs space-y-1">
            {validation.errors.map((error, idx) => (
              <div key={idx}>• {error}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={onProceed}
          disabled={!canProceed || totalToEnrich === 0}
          className="flex-1"
        >
          {totalToEnrich === 0 ? 'Nothing to Enrich' : `Proceed (${totalToEnrich} items)`}
        </Button>
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
      </div>

      {!validation.hasOpenAQKey && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          💡 Add your OpenAQ API key in secrets to enable air quality enrichment
        </p>
      )}
    </Card>
  );
}
