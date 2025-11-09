import { Link } from "react-router-dom";
import { ArrowRight, Globe, TrendingUp, MapPin, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Aurora from "@/components/Background/Aurora";
import AnimatedBackground from "@/components/Background/AnimatedBackground";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted relative">
      {/* Animated Background */}
      <AnimatedBackground />
      {/* Hero Section */}
      <section className="relative overflow-hidden h-screen">
        {/* Aurora Background */}
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <Aurora colorStops={["#1a704b", "#4A9EFF", "#de2d26"]} blend={0.6} amplitude={1.2} speed={0.4} />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 container mx-auto px-4 h-full flex items-center pointer-events-none">
          <div className="max-w-4xl mx-auto text-center space-y-8 pointer-events-auto">
            <div className="flex flex-col items-center gap-2">
              <img
                src="/logo/ai-equity-mapper.png" // promijeni putanju po potrebi
                alt="AI Equity Mapper"
                className="h-16 w-auto drop-shadow-[0_6px_18px_rgba(0,0,0,.35)]"
              />
              <div className="text-sm font-semibold tracking-widest text-white/80">AI Equity Mapper</div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground drop-shadow-lg">
              Climate Inequality
              <span className="block bg-gradient-to-r from-cii-2 via-cii-5 to-cii-9 bg-clip-text text-transparent">
                Index Dashboard
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-foreground/90 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
              Visualizing the intersection of climate risk, infrastructure access, and socioeconomic factors across
              regions worldwide.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
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
                    Explore Interactive Map
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-all duration-300" />
                  </span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="group relative text-lg px-10 h-16 bg-background/60 backdrop-blur-md border-2 border-primary/30 overflow-hidden hover:border-primary hover:bg-primary/5 transition-all duration-300 shadow-[0_0_20px_rgba(74,158,255,0.1)] hover:shadow-[0_0_40px_rgba(74,158,255,0.3)]"
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
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">What We Measure</h2>
            <p className="text-xl text-muted-foreground">
              A comprehensive view of climate inequality through multiple dimensions
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Climate Risk Card */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cii-2 to-cii-5 rounded-xl opacity-0 group-hover:opacity-100 blur transition duration-500" />
              <Card className="relative border-2 hover:border-primary transition-all duration-300 bg-card">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-cii-2 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold">Climate Risk</h3>
                  <p className="text-muted-foreground">
                    Temperature, precipitation, drought, and flood risk indicators
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Infrastructure Card */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cii-5 to-cii-7 rounded-xl opacity-0 group-hover:opacity-100 blur transition duration-500" />
              <Card className="relative border-2 hover:border-primary transition-all duration-300 bg-card">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-cii-7 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold">Infrastructure</h3>
                  <p className="text-muted-foreground">Internet connectivity, urban development, and access metrics</p>
                </CardContent>
              </Card>
            </div>

            {/* Air Quality Card */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-air-moderate to-air-unhealthy rounded-xl opacity-0 group-hover:opacity-100 blur transition duration-500" />
              <Card className="relative border-2 hover:border-primary transition-all duration-300 bg-card">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-air-unhealthy flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold">Air Quality</h3>
                  <p className="text-muted-foreground">Real-time PM2.5 and NO₂ pollution data from OpenAQ</p>
                </CardContent>
              </Card>
            </div>

            {/* Socioeconomic Card */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-success to-primary rounded-xl opacity-0 group-hover:opacity-100 blur transition duration-500" />
              <Card className="relative border-2 hover:border-primary transition-all duration-300 bg-card">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-success flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold">Socioeconomic</h3>
                  <p className="text-muted-foreground">GDP per capita, population density, and economic indicators</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
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

      {/* Footer */}
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
