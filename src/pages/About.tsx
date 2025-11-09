import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Target, Users, Database, ShieldCheck, Globe2, HelpCircle } from 'lucide-react';

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
};

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/80 to-primary/5">
      {/* Top bar */}
      <div className="container mx-auto px-4 pt-8 max-w-4xl">
        <Button asChild variant="ghost" className="mb-6 group">
          <Link to="/">
            <ArrowLeft className="mr-2 w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Home
          </Link>
        </Button>
      </div>

      <div className="container mx-auto px-4 pb-16 max-w-4xl">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeIn}
          className="space-y-4"
        >
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            About the Project
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Understanding climate inequality through data-driven visualization
          </p>
        </motion.div>

        {/* Mission / Why / Data */}
        <div className="mt-10 grid gap-6">
          {/* Mission */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeIn}
          >
            <Card className="border-border/70 hover:border-primary/40 hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Mission</CardTitle>
                    <CardDescription>Clarifying impact through a composite index</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-muted-foreground leading-relaxed">
                  The Climate Inequality Index (CII) visualizes and quantifies how climate change impacts
                  are distributed unequally across regions, combining environmental factors with
                  infrastructure access and socioeconomic conditions that shape adaptive capacity.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Why it matters */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeIn}
          >
            <Card className="border-border/70 hover:border-primary/40 hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[hsl(var(--cii-7))]/30 flex items-center justify-center">
                    <Users className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Why It Matters</CardTitle>
                    <CardDescription>Equity-first view of climate exposure</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-muted-foreground leading-relaxed">
                  Climate change doesn’t affect everyone equally. Regions with lower socioeconomic indicators
                  often face higher climate risks while having fewer resources to adapt. Mapping these
                  inequalities helps policymakers, researchers, and communities identify where intervention
                  and support are most needed.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-card/50 p-3">
                    <div className="text-xs text-muted-foreground">Focus</div>
                    <div className="text-sm font-semibold">Exposure • Access • Sensitivity</div>
                  </div>
                  <div className="rounded-lg border bg-card/50 p-3">
                    <div className="text-xs text-muted-foreground">Outcome</div>
                    <div className="text-sm font-semibold">Targeted, fair adaptation</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Data Sources */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeIn}
          >
            <Card className="border-border/70 hover:border-primary/40 hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center">
                    <Database className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Data Sources</CardTitle>
                    <CardDescription>Blending environment + access + economics</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <ul className="space-y-3 text-foreground/90">
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 mt-1 text-primary" />
                    <span><strong>OpenAQ:</strong> Real-time air quality data (PM2.5, NO₂) from global monitoring networks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 mt-1 text-primary" />
                    <span><strong>Natural Earth:</strong> High-resolution geographic boundary and geospatial reference data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 mt-1 text-primary" />
                    <span><strong>World Bank Open Data:</strong> GDP per capita, urban population, and development indicators</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 mt-1 text-primary" />
                    <span><strong>Climate Data:</strong> Temperature, precipitation, flood risk, and drought indices from ERA5 and satellite observations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 mt-1 text-primary" />
                    <span><strong>Google Gemini AI:</strong> Powered by free-tier Google Gemini API for ML-driven insights and analysis</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Stats / Coverage */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeIn}
          className="mt-12"
        >
          <Card className="overflow-hidden border-border/70">
            <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 px-6 py-5 border-b">
              <div className="flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold">Geographic Coverage</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                We continuously expand coverage and improve data quality.
              </p>
            </div>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-xl border bg-card/50 p-5 hover:shadow-md transition-all">
                  <div className="text-xs text-muted-foreground">Global Coverage</div>
                  <div className="text-3xl font-extrabold tracking-tight">195+</div>
                  <div className="text-xs text-muted-foreground mt-1">Countries & regions</div>
                </div>
                <div className="rounded-xl border bg-card/50 p-5 hover:shadow-md transition-all">
                  <div className="text-xs text-muted-foreground">Data Sources</div>
                  <div className="text-3xl font-extrabold tracking-tight">5+</div>
                  <div className="text-xs text-muted-foreground mt-1">International databases</div>
                </div>
                <div className="rounded-xl border bg-card/50 p-5 hover:shadow-md transition-all">
                  <div className="text-xs text-muted-foreground">Analysis</div>
                  <div className="text-3xl font-extrabold tracking-tight">AI</div>
                  <div className="text-xs text-muted-foreground mt-1">ML-powered insights</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <Card className="border-dashed hover:border-primary/40 transition-all">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">Real-Time Data Integration</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Live air quality monitoring from OpenAQ network, updated weekly with measurements from thousands of sensors worldwide
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-dashed hover:border-primary/40 transition-all">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">AI-Powered Analysis</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Machine learning models detect anomalies, predict trends, identify vulnerability clusters, and recommend interventions
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeIn}
          className="mt-12"
        >
          <Card className="border-border/70">
            <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 px-6 py-5 border-b">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Common questions about the Climate Inequality Index
              </p>
            </div>
            <CardContent className="p-6">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-left">
                    How is the Climate Inequality Index (CII) calculated?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    The CII is a weighted composite of three components: Climate Risk (40%), Infrastructure Access (30%), 
                    and Socioeconomic Vulnerability (30%). Each component aggregates multiple normalized indicators 
                    (0-1 scale) from real-world data sources. Higher CII scores indicate greater climate vulnerability 
                    and lower adaptive capacity. See our <Link to="/methodology" className="text-primary hover:underline">Methodology page</Link> for 
                    detailed formulas and component breakdowns.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-left">
                    How accurate and reliable is the data?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    We source data from authoritative international organizations: OpenAQ (air quality with 15,000+ 
                    monitoring stations), World Bank Open Data (economic indicators), Natural Earth (geographic boundaries), 
                    and ERA5 climate reanalysis (validated satellite and ground observations). Data undergoes quality 
                    checks including outlier detection and cross-validation. However, data availability varies by region, 
                    and indicators should be interpreted alongside local expertise. We clearly mark data gaps and 
                    estimation methods in regional details.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-left">
                    How often is the data updated?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Update frequencies vary by data source: <strong>OpenAQ air quality</strong> updates weekly with 
                    real-time measurements; <strong>World Bank socioeconomic indicators</strong> (GDP, population) update 
                    annually; <strong>climate data</strong> from ERA5 updates monthly to quarterly as new reanalysis 
                    becomes available. The CII scores are recalculated whenever underlying data refreshes. You can see 
                    the last update timestamp for each region in the dashboard.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger className="text-left">
                    What AI models power the insights and analysis?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    We use <strong>Google Gemini 2.5 Flash and Pro models</strong> via the free-tier API for advanced 
                    analytics. The AI performs five types of analysis: <strong>(1) Trend Prediction</strong> - forecasting 
                    CII trajectories to 2030 using XGBoost-style modeling; <strong>(2) Anomaly Detection</strong> - 
                    identifying unusual climate-poverty correlations; <strong>(3) Cluster Analysis</strong> - discovering 
                    geographic vulnerability hotspots using DBSCAN-style algorithms; <strong>(4) Pattern Discovery</strong> - 
                    finding hidden correlations between factors; <strong>(5) Intervention Recommendations</strong> - 
                    suggesting evidence-based climate adaptation strategies. All AI outputs are clearly labeled and 
                    should complement, not replace, human expertise.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                  <AccordionTrigger className="text-left">
                    Can I use this data for research or policy work?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes! The CII is designed as a research and decision-support tool for policymakers, researchers, 
                    NGOs, and climate advocates. All underlying data sources (OpenAQ, World Bank, Natural Earth, ERA5) 
                    are publicly available and properly attributed. When using CII data, please cite the relevant 
                    original data sources and note that this is a composite index meant to identify patterns and 
                    prioritize interventions. We recommend combining quantitative CII analysis with local community 
                    knowledge, ground-truthing, and context-specific assessments for policy decisions.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6">
                  <AccordionTrigger className="text-left">
                    Why doesn't my region appear in the database?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Regional coverage depends on data availability from our sources. Some regions may lack sufficient 
                    air quality monitoring stations, updated socioeconomic data, or high-resolution climate observations. 
                    We continuously expand coverage as new data becomes available. Currently, we prioritize regions with 
                    complete datasets across all CII components. If your region is missing, it likely reflects gaps in 
                    international monitoring infrastructure rather than lower climate risk. Check back regularly as we 
                    add new regions with improved data coverage.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-7">
                  <AccordionTrigger className="text-left">
                    How can I download or export the data?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Currently, you can view detailed metrics and AI-generated insights for each region directly in the 
                    dashboard. We're working on adding CSV/JSON export capabilities for bulk data downloads. For now, 
                    you can access individual region data through the interactive map and comparison tools. If you need 
                    bulk data access for research purposes, please contact us to discuss API access options.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-8">
                  <AccordionTrigger className="text-left">
                    Are there limitations or biases in the CII methodology?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes, like all composite indices, the CII has limitations: <strong>(1)</strong> Equal weighting 
                    assumptions may not reflect local priorities; <strong>(2)</strong> Data availability varies by region, 
                    potentially favoring well-monitored areas; <strong>(3)</strong> Aggregation can mask within-region 
                    inequalities; <strong>(4)</strong> Historical data may not capture rapid recent changes; 
                    <strong>(5)</strong> Cultural and political factors affecting vulnerability aren't quantified. 
                    We address these through transparent methodology documentation, data quality indicators, and 
                    recommending the CII as one tool among many for climate equity assessment. Always combine with 
                    qualitative local knowledge.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeIn}
          className="flex flex-col sm:flex-row gap-3 pt-10"
        >
          <Button asChild className="h-11 text-[15px] shadow-md hover:shadow-lg transition-all">
            <Link to="/methodology">View Methodology</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 text-[15px] hover:border-primary/60 hover:text-foreground transition-colors"
          >
            <Link to="/dashboard">Explore Dashboard</Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
