import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Sparkles, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';

interface ExpandedAnalysisProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regionData: any;
  basicInsight: string;
}

export const ExpandedAnalysis = ({ open, onOpenChange, regionData, basicInsight }: ExpandedAnalysisProps) => {
  const [expandedInsight, setExpandedInsight] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const generateExpandedAnalysis = async () => {
    setIsLoading(true);
    try {
      // Sanitize data before sending to edge function
      const sanitizeNumber = (value: any) => {
        if (value === null || value === undefined) return null;
        const num = Number(value);
        return isNaN(num) ? null : num;
      };

      const sanitizedRegionData = {
        ...regionData,
        // Ensure numeric fields are properly formatted
        population: sanitizeNumber(regionData.population),
        cii_score: sanitizeNumber(regionData.cii_score) ?? 0,
        climate_risk_score: sanitizeNumber(regionData.climate_risk_score),
        infrastructure_score: sanitizeNumber(regionData.infrastructure_score),
        socioeconomic_score: sanitizeNumber(regionData.socioeconomic_score),
        air_quality_pm25: sanitizeNumber(regionData.air_quality_pm25),
        air_quality_no2: sanitizeNumber(regionData.air_quality_no2),
        internet_speed_download: sanitizeNumber(regionData.internet_speed_download),
        internet_speed_upload: sanitizeNumber(regionData.internet_speed_upload),
        temperature_avg: sanitizeNumber(regionData.temperature_avg),
        precipitation_avg: sanitizeNumber(regionData.precipitation_avg),
        drought_index: sanitizeNumber(regionData.drought_index),
        flood_risk_score: sanitizeNumber(regionData.flood_risk_score),
        gdp_per_capita: sanitizeNumber(regionData.gdp_per_capita),
        urban_population_percent: sanitizeNumber(regionData.urban_population_percent),
      };

      const { data, error } = await supabase.functions.invoke('generate-expanded-insights', {
        body: { regionData: sanitizedRegionData }
      });

      if (error) throw error;
      if (data?.insight) {
        setExpandedInsight(data.insight);
      }
    } catch (error: any) {
      console.error('Error generating expanded analysis:', error);
      toast({
        title: 'Analysis Error',
        description: error.message || 'Failed to generate expanded analysis',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Helper to add new page if needed
      const checkAddPage = (neededHeight: number) => {
        if (yPosition + neededHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Header
      pdf.setFontSize(22);
      pdf.setTextColor(37, 99, 235); // primary color
      pdf.text('Climate Inequality Analysis Report', margin, yPosition);
      yPosition += 12;

      // Region Name
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      const locationType = regionData.region_type === 'country' ? 'Country' : 'Region';
      pdf.text(`${regionData.region_name}, ${regionData.country} (${locationType})`, margin, yPosition);
      yPosition += 10;

      // Divider
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      // Key Metrics
      pdf.setFontSize(14);
      pdf.setTextColor(37, 99, 235);
      pdf.text('Key Metrics', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      const metrics = [
        `Climate Inequality Index: ${(regionData.cii_score * 100).toFixed(1)}%`,
        `Climate Risk: ${regionData.climate_risk_score ? (regionData.climate_risk_score * 100).toFixed(1) + '%' : 'N/A'}`,
        `Infrastructure Gap: ${regionData.infrastructure_score ? (regionData.infrastructure_score * 100).toFixed(1) + '%' : 'N/A'}`,
        `Socioeconomic Vulnerability: ${regionData.socioeconomic_score ? (regionData.socioeconomic_score * 100).toFixed(1) + '%' : 'N/A'}`,
        `Population: ${regionData.population?.toLocaleString() || 'N/A'}`,
        `GDP per Capita: $${regionData.gdp_per_capita?.toLocaleString() || 'N/A'}`,
      ];

      metrics.forEach(metric => {
        checkAddPage(6);
        pdf.text(metric, margin + 5, yPosition);
        yPosition += 6;
      });

      yPosition += 5;
      checkAddPage(10);

      // AI Analysis Section
      pdf.setFontSize(14);
      pdf.setTextColor(37, 99, 235);
      pdf.text('AI-Powered Analysis', margin, yPosition);
      yPosition += 8;

      // Split expanded insight into paragraphs and wrap text
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      const analysisText = expandedInsight || basicInsight;
      const paragraphs = analysisText.split('\n\n');
      
      paragraphs.forEach((paragraph, index) => {
        if (paragraph.trim()) {
          const lines = pdf.splitTextToSize(paragraph.trim(), maxWidth);
          lines.forEach((line: string) => {
            checkAddPage(6);
            pdf.text(line, margin, yPosition);
            yPosition += 6;
          });
          if (index < paragraphs.length - 1) {
            yPosition += 3; // Add space between paragraphs
          }
        }
      });

      yPosition += 8;
      checkAddPage(10);

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      const footerY = pdf.internal.pageSize.getHeight() - 10;
      pdf.text(`Generated: ${new Date().toLocaleDateString()} | Powered by Lovable AI (Gemini 2.5 Flash)`, margin, footerY);
      pdf.text(`Data Year: ${regionData.data_year || 2024}`, pageWidth - margin - 30, footerY);

      // Save PDF
      const filename = `climate-report-${regionData.region_name?.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
      pdf.save(filename);

      toast({
        title: 'Report Exported',
        description: 'PDF report has been downloaded successfully',
      });
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to generate PDF report',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !expandedInsight) {
      generateExpandedAnalysis();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Comprehensive Climate Equity Analysis
                </DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  {regionData.region_name}, {regionData.country} • {regionData.region_type === 'country' ? 'Country' : 'Region'} • {regionData.data_year || 2024}
                </DialogDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                disabled={isExporting || isLoading}
                className="gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground mb-1">CII Score</p>
                <p className="text-2xl font-bold text-foreground">
                  {(regionData.cii_score * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Population</p>
                <p className="text-2xl font-bold text-foreground">
                  {regionData.population?.toLocaleString() || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">GDP per Capita</p>
                <p className="text-2xl font-bold text-foreground">
                  ${regionData.gdp_per_capita?.toLocaleString() || 'N/A'}
                </p>
              </div>
            </div>

            {/* Risk Indicators */}
            <div className="flex flex-wrap gap-2">
              {regionData.cii_score >= 0.7 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Critical Climate Risk
                </Badge>
              )}
              {regionData.air_quality_pm25 && regionData.air_quality_pm25 > 35 && (
                <Badge variant="destructive" className="gap-1">
                  Hazardous Air Quality
                </Badge>
              )}
              {regionData.flood_risk_score && regionData.flood_risk_score > 0.7 && (
                <Badge variant="destructive" className="gap-1">
                  High Flood Risk
                </Badge>
              )}
              {regionData.drought_index && regionData.drought_index > 0.7 && (
                <Badge variant="destructive" className="gap-1">
                  Severe Drought Risk
                </Badge>
              )}
              {regionData.gdp_per_capita && regionData.gdp_per_capita < 5000 && (
                <Badge variant="outline" className="gap-1">
                  Low-Income Region
                </Badge>
              )}
            </div>

            {/* Main Analysis Content */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Detailed Analysis</h3>
                <Badge variant="secondary" className="ml-auto">
                  Powered by Gemini 2.5 Flash
                </Badge>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Generating comprehensive analysis with historical trends and future projections...</span>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ) : expandedInsight ? (
                <div className="prose prose-sm max-w-none">
                  <div className="text-base text-foreground leading-relaxed space-y-4">
                    {expandedInsight.split('\n\n').map((paragraph, index) => (
                      <p key={index} className="text-foreground leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <div className="text-base text-foreground leading-relaxed space-y-4">
                    {basicInsight.split('\n\n').map((paragraph, index) => (
                      <p key={index} className="text-foreground leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Data Sources */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <strong>Data Sources:</strong> {
                  typeof regionData.data_sources === 'string' 
                    ? regionData.data_sources 
                    : Array.isArray(regionData.data_sources) 
                      ? regionData.data_sources.join(', ') 
                      : 'Multiple sources'
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <strong>Last Updated:</strong> {regionData.last_updated ? new Date(regionData.last_updated).toLocaleDateString() : 'Recently'}
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
