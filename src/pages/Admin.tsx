import { useState } from 'react';
import { CompactInitProgress } from '@/components/Admin/CompactInitProgress';
import { ScheduledJobs } from '@/components/Admin/ScheduledJobs';
import { DataEnrichment } from '@/components/Admin/DataEnrichment';
import { ComputeCII } from '@/components/Admin/ComputeCII';
import { EnrichmentStats } from '@/components/Admin/EnrichmentStats';
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, RefreshCw, Calculator, TrendingUp } from 'lucide-react';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('stats');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage data enrichment, computations, and system monitoring
          </p>
        </div>

        <CompactInitProgress />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stats" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Statistics</span>
            </TabsTrigger>
            <TabsTrigger value="enrichment" className="gap-2">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Enrichment</span>
            </TabsTrigger>
            <TabsTrigger value="compute" className="gap-2">
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Compute CII</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Scheduled Jobs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="mt-6">
            <ErrorBoundary title="Statistics Error">
              <Card>
                <CardHeader>
                  <CardTitle>Data Enrichment Statistics</CardTitle>
                  <CardDescription>
                    Overview of data sources and enrichment status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EnrichmentStats />
                </CardContent>
              </Card>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="enrichment" className="mt-6">
            <ErrorBoundary title="Data Enrichment Error">
              <Card>
                <CardHeader>
                  <CardTitle>Data Enrichment</CardTitle>
                  <CardDescription>
                    Enrich region data with real-world information from external APIs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataEnrichment />
                </CardContent>
              </Card>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="compute" className="mt-6">
            <ErrorBoundary title="Compute CII Error">
              <Card>
                <CardHeader>
                  <CardTitle>Compute Climate Inequality Index</CardTitle>
                  <CardDescription>
                    Calculate CII scores and component values for all regions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ComputeCII />
                </CardContent>
              </Card>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="jobs" className="mt-6">
            <ErrorBoundary title="Scheduled Jobs Error">
              <Card>
                <CardHeader>
                  <CardTitle>Scheduled Jobs</CardTitle>
                  <CardDescription>
                    Monitor and manage automated background tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScheduledJobs />
                </CardContent>
              </Card>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>

        <div className="mt-8 p-4 border border-border rounded-lg bg-muted/20">
          <p className="text-xs text-muted-foreground">
            <strong>Data Sources:</strong> OpenAQ (Air Quality), ERA5 (Climate), Ookla (Internet), World Bank (Economy & Demographics)
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <strong>AI Provider:</strong> Lovable AI powered by Google Gemini 2.5 Flash
          </p>
        </div>
      </div>
    </div>
  );
};

export default Admin;
