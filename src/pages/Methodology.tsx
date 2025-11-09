import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ArrowLeft,
  Sigma,
  SlidersHorizontal,
  Gauge,
  Activity,
  RefreshCcw,
  Palette,
  Database,
  TrendingUp,
} from "lucide-react";

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45 },
  },
};

export default function Methodology() {
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
        <motion.div initial="hidden" animate="show" variants={fadeIn} className="space-y-4">
          <h1 className="text-5xl font-semibold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Methodology
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">How we calculate the Climate Inequality Index</p>
        </motion.div>

        {/* CII Overview + Formula */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeIn}
          className="mt-10"
        >
          <Card className="border-border/70 hover:border-primary/40 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Sigma className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Climate Inequality Index (CII)</CardTitle>
                  <CardDescription>Composite view of exposure, access, and capacity</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 space-y-5">
              <p className="text-muted-foreground leading-relaxed">
                The CII combines three primary dimensions to assess climate vulnerability and adaptive capacity. Each
                component is normalized to 0–1 and then weighted to produce a single score.
              </p>

              {/* Formula block */}
              <div className="rounded-xl border bg-card/60 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Weighted composite
                </div>
                <pre className="text-sm leading-7 overflow-x-auto rounded-md p-3 bg-muted/60">
                  {`CII = 0.40 · ClimateRisk
    + 0.30 · (1 - InfrastructureAccess)
    + 0.30 · SocioeconomicVulnerability`}
                </pre>
                <p className="text-xs text-muted-foreground mt-2">
                  We invert InfrastructureAccess so that better access reduces the overall risk.
                </p>
              </div>

              {/* Quick metric tiles */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-card/50 p-4">
                  <div className="text-xs text-muted-foreground">Weight</div>
                  <div className="text-2xl font-bold">40%</div>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" /> Climate Risk
                  </div>
                </div>
                <div className="rounded-xl border bg-card/50 p-4">
                  <div className="text-xs text-muted-foreground">Weight</div>
                  <div className="text-2xl font-bold">30%</div>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5" /> Infrastructure Access
                  </div>
                </div>
                <div className="rounded-xl border bg-card/50 p-4">
                  <div className="text-xs text-muted-foreground">Weight</div>
                  <div className="text-2xl font-bold">30%</div>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Socioeconomic Score
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Component Definitions */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeIn}
          className="mt-8 grid gap-6"
        >
          <Card className="border-border/70 hover:border-primary/40 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Component Breakdown</CardTitle>
                  <CardDescription>Inputs and transformations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 space-y-6">
              <div className="space-y-4 pl-4 border-l-4 border-primary/25">
                <div>
                  <h3 className="font-semibold text-lg mb-1">1) Climate Risk (40%)</h3>
                  <p className="text-sm text-muted-foreground">
                    Aggregates temperature anomalies, precipitation variability, drought index, and flood risk. Each
                    sub-indicator is min-max normalized per year.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">2) Infrastructure Access (30%)</h3>
                  <p className="text-sm text-muted-foreground">
                    Captures enabling conditions such as internet speed (down/up), urban share, and air quality (PM2.5,
                    NO₂). Higher access → lower contribution (we invert this term).
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">3) Socioeconomic (30%)</h3>
                  <p className="text-sm text-muted-foreground">
                    Uses GDP per capita (PPP where available) and population density as proxies for adaptive capacity
                    and stress. Indicators are normalized and direction-aligned.
                  </p>
                </div>
              </div>

              {/* Small data-source note */}
              <div className="rounded-lg border bg-card/50 p-3 text-sm text-foreground/90 flex items-start gap-2">
                <Database className="w-4 h-4 text-primary mt-0.5" />
                <span>
                  Inputs sourced from <strong>OpenAQ</strong> (real-time air quality),{" "}
                  <strong>World Bank Open Data</strong> (GDP, urban population),
                  <strong> Natural Earth</strong> (geographic boundaries), and{" "}
                  <strong>ERA5/satellite observations</strong> (climate indicators). AI insights powered by{" "}
                  <strong>Google Gemini</strong> free-tier API.
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Color Scale */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeIn}
          className="mt-8"
        >
          <Card className="border-border/70 hover:border-primary/40 hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 px-6 py-5 border-b">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold">Color Scale Interpretation</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Diverging scale from blue (low) → white (neutral) → red (high).
              </p>
            </div>
            <CardContent className="p-6 space-y-5">
              {/* Swatch bar */}
              <div className="h-4 rounded-full overflow-hidden border">
                <div className="w-full h-full grid grid-cols-10">
                  <div className="bg-[hsl(var(--cii-1))]" />
                  <div className="bg-[hsl(var(--cii-2))]" />
                  <div className="bg-[hsl(var(--cii-3))]" />
                  <div className="bg-[hsl(var(--cii-4))]" />
                  <div className="bg-[hsl(var(--cii-5))]" />
                  <div className="bg-[hsl(var(--cii-6))]" />
                  <div className="bg-[hsl(var(--cii-7))]" />
                  <div className="bg-[hsl(var(--cii-8))]" />
                  <div className="bg-[hsl(var(--cii-9))]" />
                  <div className="bg-[hsl(var(--cii-10))]" />
                </div>
              </div>

              {/* Legend rows */}
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    swatch: "cii-1",
                    range: "0.0 – 0.2",
                    label: "Very Low Risk",
                    desc: "Strong adaptive capacity, minimal climate risk",
                  },
                  {
                    swatch: "cii-3",
                    range: "0.3 – 0.4",
                    label: "Low–Medium Risk",
                    desc: "Good infrastructure, moderate exposure",
                  },
                  { swatch: "cii-5", range: "≈ 0.5", label: "Neutral", desc: "Balanced risk and capacity" },
                  {
                    swatch: "cii-7",
                    range: "0.6 – 0.7",
                    label: "High Risk",
                    desc: "Significant exposure, limited infrastructure",
                  },
                  {
                    swatch: "cii-9",
                    range: "0.8 – 1.0",
                    label: "Critical",
                    desc: "High vulnerability, minimal capacity",
                  },
                ].map((i) => (
                  <div key={i.swatch} className="flex items-center gap-4 rounded-lg border bg-card/50 p-3">
                    <div className={`w-14 h-8 rounded bg-[hsl(var(--${i.swatch}))] flex-shrink-0`} />
                    <div>
                      <p className="font-medium">
                        {i.range}: {i.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{i.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data Processing */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeIn}
          className="mt-8"
        >
          <Card className="border-border/70 hover:border-primary/40 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                  <RefreshCcw className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Data Processing</CardTitle>
                  <CardDescription>Normalization, weighting, refresh cadence</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-card/50 p-4">
                  <div className="text-xs text-muted-foreground mb-1">Normalization</div>
                  <p className="text-sm text-foreground/90">
                    Min–max scaling per indicator and year to 0–1 range. Outlier detection and trimming at 1st/99th
                    percentiles for data quality.
                  </p>
                </div>
                <div className="rounded-xl border bg-card/50 p-4">
                  <div className="text-xs text-muted-foreground mb-1">Weighting</div>
                  <p className="text-sm text-foreground/90">
                    40% climate risk · 30% infrastructure · 30% socioeconomic. Directionality aligned so higher CII =
                    worse vulnerability.
                  </p>
                </div>
                <div className="rounded-xl border bg-card/50 p-4">
                  <div className="text-xs text-muted-foreground mb-1">Update Frequency</div>
                  <p className="text-sm text-foreground/90">
                    OpenAQ weekly updates; World Bank socioeconomic annually; climate data from ERA5 reanalysis and
                    satellite observations.
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
                <strong>Important:</strong> The CII is a research and analysis tool designed to identify climate
                inequality patterns. AI-powered insights use Google Gemini free-tier API for predictive modeling,
                anomaly detection, cluster analysis, and intervention recommendations. Always combine quantitative
                analysis with local expertise and community context when prioritizing climate adaptation interventions.
              </div>
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
            <Link to="/dashboard">View Dashboard</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 text-[15px] hover:border-primary/60 hover:text-foreground transition-colors"
          >
            <Link to="/about">About the Project</Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
