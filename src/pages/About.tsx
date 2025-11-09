import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Target, Users, Database, ShieldCheck, Globe2 } from 'lucide-react';

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.08 * i, ease: 'easeOut' }
  })
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
            custom={1}
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
            custom={2}
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
                    <span><strong>OpenAQ:</strong> Real-time air quality (PM2.5, NO₂)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 mt-1 text-primary" />
                    <span><strong>Natural Earth:</strong> Geographic boundary data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 mt-1 text-primary" />
                    <span><strong>World Bank:</strong> Socioeconomic indicators</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 mt-1 text-primary" />
                    <span><strong>Climate Data Sources:</strong> Temperature, precipitation, drought indices</span>
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
          custom={3}
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
                  <div className="text-xs text-muted-foreground">Regions</div>
                  <div className="text-3xl font-extrabold tracking-tight">43</div>
                </div>
                <div className="rounded-xl border bg-card/50 p-5 hover:shadow-md transition-all">
                  <div className="text-xs text-muted-foreground">Countries</div>
                  <div className="text-3xl font-extrabold tracking-tight">20</div>
                </div>
                <div className="rounded-xl border bg-card/50 p-5 hover:shadow-md transition-all">
                  <div className="text-xs text-muted-foreground">Granularity</div>
                  <div className="text-3xl font-extrabold tracking-tight">Country + Region</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <Card className="border-dashed hover:border-primary/40 transition-all">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">European Coverage</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Germany, France, Spain, Italy, Poland, UK, Netherlands, Sweden, Portugal, Greece,
                      Romania, Bulgaria
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-dashed hover:border-primary/40 transition-all">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">Global Coverage</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      United States, Canada, China, India, Brazil, Mexico, Australia, Japan
                    </p>
                  </CardContent>
                </Card>
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
          custom={4}
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
