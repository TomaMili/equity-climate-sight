import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function Methodology() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Button asChild variant="ghost" className="mb-8">
          <Link to="/">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Home
          </Link>
        </Button>

        <div className="space-y-12">
          <div>
            <h1 className="text-5xl font-bold mb-4">Methodology</h1>
            <p className="text-xl text-muted-foreground">
              How we calculate the Climate Inequality Index
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Climate Inequality Index (CII)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                The CII is a composite metric that combines three primary dimensions to assess climate 
                vulnerability and adaptive capacity:
              </p>
              <div className="space-y-4 pl-4 border-l-4 border-primary/20">
                <div>
                  <h3 className="font-semibold text-lg mb-2">1. Climate Risk Score (40%)</h3>
                  <p className="text-muted-foreground text-sm">
                    Combines temperature extremes, precipitation patterns, drought indices, and flood risk 
                    scores to measure direct climate hazards.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">2. Infrastructure Score (30%)</h3>
                  <p className="text-muted-foreground text-sm">
                    Measures access to critical infrastructure including internet connectivity, urban 
                    development, and air quality (PM2.5, NO₂ levels).
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">3. Socioeconomic Score (30%)</h3>
                  <p className="text-muted-foreground text-sm">
                    Incorporates GDP per capita, population density, and other economic indicators that 
                    influence adaptive capacity.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Color Scale Interpretation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                Our visualization uses a diverging color scale from blue (low inequality) through white 
                (neutral) to red (high inequality):
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-8 rounded bg-cii-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium">0.0 - 0.2: Very Low Risk</p>
                    <p className="text-sm text-muted-foreground">Strong adaptive capacity, minimal climate risk</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-16 h-8 rounded bg-cii-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium">0.3 - 0.4: Low-Medium Risk</p>
                    <p className="text-sm text-muted-foreground">Good infrastructure, moderate climate exposure</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-16 h-8 rounded bg-cii-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">0.5: Neutral</p>
                    <p className="text-sm text-muted-foreground">Balanced risk and adaptive capacity</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-16 h-8 rounded bg-cii-7 flex-shrink-0" />
                  <div>
                    <p className="font-medium">0.6 - 0.7: High Risk</p>
                    <p className="text-sm text-muted-foreground">Significant climate exposure, limited infrastructure</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-16 h-8 rounded bg-cii-9 flex-shrink-0" />
                  <div>
                    <p className="font-medium">0.8 - 1.0: Critical Risk</p>
                    <p className="text-sm text-muted-foreground">High vulnerability, minimal adaptive capacity</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Data Processing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-2">Normalization</h3>
                  <p className="text-sm text-muted-foreground">
                    All indicators are normalized to a 0-1 scale to ensure comparability across metrics.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Weighting</h3>
                  <p className="text-sm text-muted-foreground">
                    Component scores are weighted based on empirical research on climate vulnerability factors.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Update Frequency</h3>
                  <p className="text-sm text-muted-foreground">
                    Air quality data is updated weekly via OpenAQ API. Other indicators are updated annually 
                    or as new data becomes available.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-muted/50 p-6 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> The CII is a research tool designed to highlight patterns and trends in 
              climate inequality. While we strive for accuracy, the index should be interpreted alongside 
              other data sources and local knowledge for comprehensive understanding.
            </p>
          </div>

          <div className="flex gap-4">
            <Button asChild>
              <Link to="/dashboard">
                View Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/about">
                About the Project
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
