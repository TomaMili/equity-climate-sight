import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Globe,
  TrendingUp,
  MapPin,
  Shield,
  BarChart3,
  Sparkles,
  Layers,
  GitCompare,
  Clock,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Aurora from "@/components/Background/Aurora";
import logo from "@/assets/ai-equity-mapper-logo2.png";

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted relative">
      <section className="relative overflow-hidden h-screen w-full">
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <Aurora
            colorStops={["#047857", "#022c22", "#047857"]}
            blend={0.4}
            amplitude={1.2}
            speed={0.4}
          />
        </div>

        <div className="relative z-10 w-full h-full flex items-center justify-center px-4">
          <div className="text-center space-y-8 max-w-5xl">
            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeIn}
              className="flex flex-col items-center gap-6"
            >
              <img
                src={logo}
                alt="AI Equity Mapper"
                className="w-full max-w-2xl h-auto drop-shadow-[0_6px_18px_rgba(0,0,0,.35)]"
              />
            </motion.div>

            <motion.p
              initial="hidden"
              animate="show"
              variants={fadeIn}
              className="text-xl md:text-2xl text-foreground/90 max-w-3xl mx-auto leading-relaxed drop-shadow-md font-normal"
            >
              Visualizing the intersection of climate risk, infrastructure access, and socioeconomic factors
              across regions worldwide.
            </motion.p>

            {/* Metrics Chips */}
            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeIn}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              {[
                { icon: Globe, label: "200+ Countries" },
                { icon: Layers, label: "4000+ Regions" },
                { icon: Clock, label: "2020–2025 Coverage" },
                { icon: Shield, label: "OpenAQ Weekly Updates" },
              ].map(({ icon: Icon, label }, i) => (
                <div
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border bg-background/70 backdrop-blur px-3 py-1.5 text-sm shadow-sm hover:shadow transition-all"
                >
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{label}</span>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeIn}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2"
            >
              <Button
                asChild
                size="lg"
                className="group relative text-lg px-10 h-16 overflow-hidden bg-gradient-to-r from-primary to-accent border-0 transition-all duration-500"
              >
                <Link to="/dashboard">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 animate-[shimmer_2s_infinite]" />
                  </div>
                  <span className="relative z-10 flex items-center font-semibold tracking-wide">
                    Explore Interactive Map
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-all duration-300" />
                  </span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="group relative text-lg px-10 h-16 bg-background/60 backdrop-blur-md border-2 border-primary/30 overflow-hidden hover:border-primary hover:bg-primary/5 transition-all duration-300 "
              >
                <Link to="/methodology">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 animate-[shimmer_2s_infinite]" />
                  </div>
                  <span className="relative z-10 font-semibold tracking-wide group-hover:text-primary transition-colors">
                    Learn Methodology
                  </span>
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold mb-4">What We Measure</h2>
            <p className="text-xl text-muted-foreground">
              A comprehensive view of climate inequality through multiple dimensions
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                title: "Climate Risk",
                desc: "Temperature anomalies, precipitation variability, drought and flood risk",
                icon: TrendingUp,
                bg: "from-cii-2 to-cii-5",
                badgeBg: "bg-cii-2",
              },
              {
                title: "Infrastructure",
                desc: "Internet connectivity, urban development, and access metrics",
                icon: MapPin,
                bg: "from-cii-5 to-cii-7",
                badgeBg: "bg-cii-7",
              },
              {
                title: "Air Quality",
                desc: "Real-time PM2.5 and NO₂ pollution data from OpenAQ",
                icon: Shield,
                bg: "from-air-moderate to-air-unhealthy",
                badgeBg: "bg-air-unhealthy",
              },
              {
                title: "Socioeconomic",
                desc: "GDP per capita, population density, and economic indicators",
                icon: Globe,
                bg: "from-sidebar-primary to-sidebar-ring",
                badgeBg: "bg-sidebar-ring",
              },
            ].map(({ title, desc, icon: Icon, bg, badgeBg }, i) => (
              <motion.div key={title} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fadeIn}>
                <div className="group relative h-full cursor-default">
                  <div className={`absolute -inset-0.5 bg-gradient-to-r ${bg} rounded-xl opacity-0 group-hover:opacity-100 blur transition duration-500`} />
                  <Card className="relative border-2 hover:border-primary transition-all duration-300 bg-card h-full">
                    <CardContent className="p-6 space-y-4">
                      <div className={`w-12 h-12 rounded-lg ${badgeBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold">{title}</h3>
                      <p className="text-muted-foreground">{desc}</p>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-b from-background to-muted/40">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-semibold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">
              From raw data streams to an equity-focused composite index
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Collect & Normalize",
                desc: "OpenAQ, World Bank, and climate archives are standardized to 0–1 per year.",
                icon: Layers,
              },
              {
                title: "Score & Weight",
                desc: "CII = 0.40·Risk + 0.30·(1–Infra) + 0.30·Socioeconomic.",
                icon: BarChart3,
              },
              {
                title: "Compare & Act",
                desc: "Drill into regions, compare up to 4 areas, and export insights.",
                icon: GitCompare,
              },
            ].map(({ title, desc, icon: Icon }, i) => (
              <motion.div key={title} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fadeIn}>
                <Card className="h-full pb-4 border-border/70 hover:border-primary/40 hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-2xl">{title}</CardTitle>
                    </div>
                    <CardDescription className="pl-[60px] -mt-2">{desc}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== AI Insights Preview ===== */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-6 items-stretch">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fadeIn}>
              <Card className="h-full border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-accent/5 to-background shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold">AI Climate Analysis</CardTitle>
                      <CardDescription className="text-xs">Expert assessment powered by Gemini 2.5</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md border bg-muted/40 p-4">
                    <p className="text-sm leading-6 text-foreground/90">
                      “Southern coastal regions show elevated <strong>heat exposure</strong> and <strong>PM2.5</strong> spikes,
                      while <strong>infrastructure access</strong> remains below national median. Prioritize cooling centers,
                      tree canopy expansion, and last-mile internet upgrades.”
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border bg-card/50 p-3 text-sm">
                      <div className="text-xs text-muted-foreground">Suggested Actions</div>
                      <div className="mt-1 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        Heat-canopy program
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        AQ monitoring rollout
                      </div>
                    </div>
                    <div className="rounded-lg border bg-card/50 p-3 text-sm">
                      <div className="text-xs text-muted-foreground">Top Drivers</div>
                      <div className="mt-1">Heat risk ↑, PM2.5 ↑, Infra access ↓</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button asChild>
                      <Link to="/dashboard">Open Dashboard</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/methodology">How It’s Calculated</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Stats */}
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fadeIn}>
              <Card className="h-full border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Platform Snapshot</CardTitle>
                  <CardDescription>Coverage & cadence</CardDescription>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                  {[
                    { label: "Regions", value: "4000+" },
                    { label: "Countries", value: "200+" },
                    { label: "Air Data", value: "Daily" },
                    { label: "Other Data", value: "Weekly" },
                  ].map((i) => (
                    <div key={i.label} className="rounded-xl border bg-card/50 p-4 hover:shadow-md transition-all">
                      <div className="text-xs text-muted-foreground">{i.label}</div>
                      <div className="text-2xl tracking-tight">{i.value}</div>
                    </div>
                  ))}
                  <div className="sm:col-span-2 rounded-xl border bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-4">
                    <div className="text-xs text-muted-foreground">Note</div>
                    <div className="text-sm">
                      CII is a research index—use alongside local context when prioritizing interventions.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold">Ready to Explore?</h2>
            <p className="text-xl text-muted-foreground">
              Dive into the interactive map to discover climate inequality patterns across 43 regions in 20 countries.
            </p>
            <Button
              asChild
              size="lg"
              className="group relative text-lg px-10 h-16 overflow-hidden bg-gradient-to-r from-primary to-accent border-0 shadow-[0_0_30px_rgba(74,158,255,0.3)] hover:shadow-[0_0_50px_rgba(74,158,255,0.5)] transition-all duration-500"
            >
              <Link to="/dashboard">
                <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 animate-[shimmer_2s_infinite]" />
                </div>
                <span className="relative z-10 flex items-center font-bold tracking-wide">
                  Start Exploring
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-all duration-300" />
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="py-12 bg-card border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              © 2025 Climate Inequality Index. Data from OpenAQ, Natural Earth, and World Bank.
            </div>
            <div className="flex gap-6">
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About
              </Link>
              <Link to="/methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Methodology
              </Link>
              <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
