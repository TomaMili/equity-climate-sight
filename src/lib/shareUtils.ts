/**
 * Utilities for generating shareable links and managing share functionality
 */

export interface ShareableRegion {
  id: string;
  region_name: string;
  country: string;
  cii_score: number;
}

/**
 * Generate a shareable URL for a single region
 */
export function generateRegionShareUrl(region: ShareableRegion): string {
  const baseUrl = window.location.origin;
  const params = new URLSearchParams({
    region: region.id,
    name: region.region_name,
    country: region.country,
  });
  return `${baseUrl}/dashboard?${params.toString()}`;
}

/**
 * Generate a shareable URL for region comparison
 */
export function generateComparisonShareUrl(regions: ShareableRegion[]): string {
  const baseUrl = window.location.origin;
  const regionIds = regions.map(r => r.id).join(',');
  const regionNames = regions.map(r => r.region_name).join(' vs ');
  const params = new URLSearchParams({
    compare: regionIds,
    names: regionNames,
  });
  return `${baseUrl}/dashboard?${params.toString()}`;
}

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        return true;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Generate Open Graph meta tags for a region
 */
export function generateRegionMetaTags(region: ShareableRegion): {
  title: string;
  description: string;
  url: string;
} {
  const ciiPercent = (region.cii_score * 100).toFixed(1);
  const title = `${region.region_name}, ${region.country} - Climate Inequality Index`;
  const description = `View climate inequality data for ${region.region_name}. CII Score: ${ciiPercent}%. Explore AI-powered insights and environmental metrics on AI Equity Mapper.`;
  const url = generateRegionShareUrl(region);

  return { title, description, url };
}

/**
 * Generate Open Graph meta tags for comparison
 */
export function generateComparisonMetaTags(regions: ShareableRegion[]): {
  title: string;
  description: string;
  url: string;
} {
  const regionNames = regions.map(r => r.region_name).join(' vs ');
  const title = `Compare: ${regionNames} - Climate Inequality Analysis`;
  const description = `Compare climate inequality across ${regions.length} regions: ${regionNames}. View side-by-side analysis on AI Equity Mapper.`;
  const url = generateComparisonShareUrl(regions);

  return { title, description, url };
}

/**
 * Parse shared URL parameters
 */
export function parseSharedUrlParams(): {
  type: 'region' | 'comparison' | null;
  regionId?: string;
  regionIds?: string[];
} {
  const params = new URLSearchParams(window.location.search);
  
  if (params.has('region')) {
    return {
      type: 'region',
      regionId: params.get('region') || undefined,
    };
  }
  
  if (params.has('compare')) {
    const compareParam = params.get('compare');
    return {
      type: 'comparison',
      regionIds: compareParam ? compareParam.split(',') : [],
    };
  }
  
  return { type: null };
}
