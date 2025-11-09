import { useEffect } from 'react';

interface MetaTagsConfig {
  title: string;
  description: string;
  url: string;
  image?: string;
}

/**
 * Hook to dynamically update meta tags for social media sharing
 */
export function useShareMetaTags(config: MetaTagsConfig | null) {
  useEffect(() => {
    if (!config) return;

    const defaultImage = `${window.location.origin}/ai-equity-mapper-logo2.png`;
    const image = config.image || defaultImage;

    // Update document title
    document.title = config.title;

    // Helper to update or create meta tag
    const updateMetaTag = (property: string, content: string, isProperty = true) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${property}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, property);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Open Graph tags
    updateMetaTag('og:title', config.title);
    updateMetaTag('og:description', config.description);
    updateMetaTag('og:url', config.url);
    updateMetaTag('og:image', image);
    updateMetaTag('og:type', 'website');

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image', false);
    updateMetaTag('twitter:title', config.title, false);
    updateMetaTag('twitter:description', config.description, false);
    updateMetaTag('twitter:image', image, false);

    // Standard meta tags
    updateMetaTag('description', config.description, false);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = config.url;

    // Cleanup function to reset to defaults
    return () => {
      document.title = 'AI Equity Mapper - Climate Inequality Visualization';
    };
  }, [config]);
}
