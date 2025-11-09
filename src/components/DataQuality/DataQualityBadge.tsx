import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DataQualityBadgeProps {
  dataSources: string[];
  size?: 'sm' | 'default';
  showIcon?: boolean;
}

export function DataQualityBadge({ dataSources, size = 'default', showIcon = true }: DataQualityBadgeProps) {
  const isSynthetic = dataSources?.includes('Synthetic');
  const isReal = !isSynthetic && dataSources?.length > 0;
  
  const sources = dataSources?.filter(s => s !== 'Natural Earth' && s !== 'Real Data') || [];
  const sourcesText = sources.length > 0 ? sources.join(', ') : 'No data sources';
  
  if (isSynthetic) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`border-amber-500 text-amber-700 dark:text-amber-400 ${
                size === 'sm' ? 'text-xs px-1.5 py-0' : ''
              }`}
            >
              {showIcon && <AlertCircle className={size === 'sm' ? 'h-3 w-3 mr-1' : 'h-3.5 w-3.5 mr-1'} />}
              Synthetic Data
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">This region uses placeholder data.</p>
            <p className="text-xs">Click the enrich button to fetch real data.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (isReal) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`border-green-500 text-green-700 dark:text-green-400 ${
                size === 'sm' ? 'text-xs px-1.5 py-0' : ''
              }`}
            >
              {showIcon && <CheckCircle2 className={size === 'sm' ? 'h-3 w-3 mr-1' : 'h-3.5 w-3.5 mr-1'} />}
              Real Data
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs font-medium mb-1">Real-world data sources:</p>
            <p className="text-xs">{sourcesText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <Badge variant="outline" className={size === 'sm' ? 'text-xs px-1.5 py-0' : ''}>
      No Data
    </Badge>
  );
}
