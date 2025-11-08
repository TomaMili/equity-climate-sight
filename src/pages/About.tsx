import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Target, Users, Database } from 'lucide-react';

export default function About() {
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
            <h1 className="text-5xl font-bold mb-4">About the Project</h1>
            <p className="text-xl text-muted-foreground">
              Understanding climate inequality through data-driven visualization
            </p>
          </div>

          <Card>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                  <Target className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-3">Mission</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    The Climate Inequality Index (CII) aims to visualize and quantify how climate change impacts 
                    are distributed unequally across regions, taking into account not just environmental factors, 
                    but also infrastructure access and socioeconomic conditions that affect a region's ability 
                    to adapt and respond to climate challenges.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-cii-7 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-3">Why It Matters</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Climate change doesn't affect everyone equally. Regions with lower socioeconomic indicators 
                    often face higher climate risks while having fewer resources to adapt. By mapping these 
                    inequalities, we help policymakers, researchers, and communities identify where intervention 
                    and support are most needed.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-success flex items-center justify-center flex-shrink-0">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-3">Data Sources</h2>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>OpenAQ:</strong> Real-time air quality data (PM2.5, NO₂)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Natural Earth:</strong> Geographic boundary data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>World Bank:</strong> Socioeconomic indicators</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Climate Data Sources:</strong> Temperature, precipitation, drought indices</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Geographic Coverage</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our current dataset covers <strong>43 regions</strong> across <strong>20 countries</strong>, 
              including both country-level and regional/state-level data for major economies. We continuously 
              work to expand coverage and improve data quality.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">European Coverage</h3>
                  <p className="text-sm text-muted-foreground">
                    Germany, France, Spain, Italy, Poland, UK, Netherlands, Sweden, Portugal, Greece, 
                    Romania, Bulgaria
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">Global Coverage</h3>
                  <p className="text-sm text-muted-foreground">
                    United States, Canada, China, India, Brazil, Mexico, Australia, Japan
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex gap-4 pt-8">
            <Button asChild>
              <Link to="/methodology">
                View Methodology
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard">
                Explore Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
