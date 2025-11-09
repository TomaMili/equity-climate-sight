// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_LIMIT = 200;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const {
      year = 2024,
      stage = "regions", // 'regions' | 'countries'
      offset = 0,
      limit = DEFAULT_LIMIT,
    } = payload as { year?: number; stage?: "regions" | "countries"; offset?: number; limit?: number };

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (stage === "regions") {
      // --- total count for regions (for client progress UI)
      const { count: totalRegions, error: countErr } = await supabase
        .from("climate_inequality_regions")
        .select("*", { count: "exact", head: true })
        .eq("data_year", year)
        .eq("region_type", "region");
      if (countErr) throw countErr;

      // --- fetch a batch
      const { data: rows, error: fetchErr } = await supabase
        .from("climate_inequality_regions")
        .select("*")
        .eq("data_year", year)
        .eq("region_type", "region")
        .order("region_code", { ascending: true })
        .range(offset, offset + limit - 1);

      if (fetchErr) throw fetchErr;

      let computed = 0;
      let skipped = 0;

      for (const region of rows ?? []) {
        try {
          const cii = computeCII(region);
          const breakdown = getComponentBreakdown(region);
          if (cii === null) {
            skipped++;
            continue;
          }
          const { error: updErr } = await supabase
            .from("climate_inequality_regions")
            .update({
              cii_score: cii,
              cii_climate_risk_component: breakdown.climateRisk,
              cii_infrastructure_gap_component: breakdown.infrastructureGap,
              cii_socioeconomic_vuln_component: breakdown.socioeconomicVuln,
              cii_air_quality_component: breakdown.airQuality,
              last_updated: new Date().toISOString(),
            })
            .eq("region_code", region.region_code)
            .eq("data_year", year);
          if (updErr) {
            console.error("update region failed:", updErr);
            skipped++;
          } else {
            computed++;
          }
        } catch (e) {
          console.error("region process error:", e);
          skipped++;
        }
      }

      const nextOffset = offset + (rows?.length ?? 0);
      const has_more = nextOffset < (totalRegions ?? 0);

      return jsonOk({
        success: true,
        stage: "regions",
        year,
        computed,
        skipped,
        total: totalRegions ?? 0,
        has_more,
        next_offset: nextOffset,
        message: `Processed ${computed} region rows (offset ${offset}…${nextOffset - 1})`,
      });
    }

    // stage === 'countries' -> average countries in small batches too
    // 1) fetch all countries list (just codes) to paginate deterministically
    const { data: countries, error: listErr } = await supabase
      .from("climate_inequality_regions")
      .select("region_code,country")
      .eq("data_year", year)
      .eq("region_type", "country")
      .order("region_code", { ascending: true });

    if (listErr) throw listErr;

    const totalCountries = countries?.length ?? 0;
    const batch = countries?.slice(offset, offset + limit) ?? [];

    let updated = 0;
    for (const c of batch) {
      try {
        const { data: parts, error: partErr } = await supabase
          .from("climate_inequality_regions")
          .select(
            "cii_score, cii_climate_risk_component, cii_infrastructure_gap_component, cii_socioeconomic_vuln_component, cii_air_quality_component",
          )
          .eq("data_year", year)
          .eq("region_type", "region")
          .eq("country", c.country)
          .not("cii_score", "is", null);

        if (partErr) throw partErr;
        if (!parts || parts.length === 0) continue;

        const avgCII = mean(parts.map((r) => r.cii_score ?? 0));
        const avgClimate = mean(parts.map((r) => r.cii_climate_risk_component ?? 0));
        const avgInfra = mean(parts.map((r) => r.cii_infrastructure_gap_component ?? 0));
        const avgSocio = mean(parts.map((r) => r.cii_socioeconomic_vuln_component ?? 0));
        const avgAir = mean(parts.map((r) => r.cii_air_quality_component ?? 0));

        const { error: updErr } = await supabase
          .from("climate_inequality_regions")
          .update({
            cii_score: avgCII,
            cii_climate_risk_component: avgClimate,
            cii_infrastructure_gap_component: avgInfra,
            cii_socioeconomic_vuln_component: avgSocio,
            cii_air_quality_component: avgAir,
            last_updated: new Date().toISOString(),
          })
          .eq("region_code", c.region_code)
          .eq("data_year", year);

        if (!updErr) updated++;
      } catch (e) {
        console.error("country process error:", e);
      }
    }

    const nextOffset = offset + batch.length;
    const has_more = nextOffset < totalCountries;

    return jsonOk({
      success: true,
      stage: "countries",
      year,
      computed: updated,
      skipped: 0,
      total: totalCountries,
      has_more,
      next_offset: nextOffset,
      message: `Averaged ${updated} countries (offset ${offset}…${nextOffset - 1})`,
    });
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

/* ------------- Scoring (same sharp version as before) ------------- */

function computeCII(region: any): number | null {
  const parts: { score: number; weight: number }[] = [];

  const climate = computeClimateRisk(region);
  if (climate !== null) parts.push({ score: climate, weight: 0.3 });

  const infra = computeInfrastructureGap(region);
  if (infra !== null) parts.push({ score: infra, weight: 0.25 });

  const socio = computeSocioeconomicVulnerability(region);
  if (socio !== null) parts.push({ score: socio, weight: 0.25 });

  const air = computeAirQualityScore(region);
  if (air !== null) parts.push({ score: air, weight: 0.2 });

  if (!parts.length) {
    const est =
      0.3 * estimateClimateRiskByRegion(region) +
      0.25 * estimateInfrastructureGapByRegion(region) +
      0.25 * estimateSocioeconomicVulnByRegion(region) +
      0.2 * estimateAirQualityByRegion(region);
    return clamp01(est);
  }

  const total = parts.reduce((s, p) => s + p.weight, 0);
  return clamp01(parts.reduce((s, p) => s + p.score * (p.weight / total), 0));
}

/* ---- Climate ---- */
function computeClimateRisk(region: any): number | null {
  const f: number[] = [];
  if (isNum(region.temperature_avg)) {
    const t = +region.temperature_avg;
    let r = 0;
    if (t < 10) r = Math.min(1, (10 - t) / 18);
    else if (t > 20) r = Math.min(1, (t - 20) / 18);
    f.push(clamp01(r * 1.4));
  }
  if (isNum(region.drought_index)) f.push(clamp01(region.drought_index) * 1.3);
  if (isNum(region.flood_risk_score)) f.push(clamp01(region.flood_risk_score) * 1.25);
  if (isNum(region.precipitation_avg)) {
    const p = +region.precipitation_avg;
    let r = 0;
    if (p < 400) r = lerp(0.8, 1.0, (400 - p) / 400);
    else if (p > 3000) r = lerp(0.7, 1.0, Math.min(1, (p - 3000) / 2000));
    else if (p < 800) r = lerp(0.0, 0.3, (800 - p) / 400);
    else if (p > 2000) r = lerp(0.0, 0.3, (p - 2000) / 1000);
    f.push(clamp01(r));
  }
  if (isNum(region.climate_risk_score)) f.push(clamp01(region.climate_risk_score));
  if (!f.length) return estimateClimateRiskByRegion(region);
  return clamp01(mean(f));
}

function estimateClimateRiskByRegion(region: any): number {
  const c = (region.country || "").toLowerCase();
  const subSaharan = [
    "nigeria",
    "kenya",
    "ethiopia",
    "tanzania",
    "uganda",
    "ghana",
    "mozambique",
    "mali",
    "niger",
    "chad",
    "sudan",
    "somalia",
    "senegal",
    "burkina faso",
    "malawi",
    "zambia",
    "zimbabwe",
    "madagascar",
    "cameroon",
    "ivory coast",
    "angola",
    "benin",
    "togo",
    "sierra leone",
    "liberia",
    "guinea",
    "democratic republic of the congo",
    "burundi",
    "rwanda",
    "namibia",
    "botswana",
  ];
  const smallIslands = [
    "maldives",
    "seychelles",
    "mauritius",
    "fiji",
    "samoa",
    "tonga",
    "vanuatu",
    "solomon islands",
    "kiribati",
    "marshall islands",
    "tuvalu",
    "nauru",
  ];
  const southAsia = ["india", "bangladesh", "pakistan", "sri lanka", "nepal", "bhutan", "afghanistan"];
  const seAsia = ["indonesia", "philippines", "vietnam", "myanmar", "thailand", "cambodia", "laos", "malaysia"];
  const mena = [
    "egypt",
    "saudi arabia",
    "iraq",
    "iran",
    "yemen",
    "syria",
    "jordan",
    "libya",
    "tunisia",
    "morocco",
    "algeria",
  ];
  const latin = ["brazil", "mexico", "colombia", "argentina", "peru", "venezuela", "chile", "ecuador", "bolivia"];
  if (subSaharan.includes(c)) return 0.75;
  if (smallIslands.includes(c)) return 0.85;
  if (southAsia.includes(c)) return 0.8;
  if (seAsia.includes(c)) return 0.65;
  if (mena.includes(c)) return 0.7;
  if (latin.includes(c)) return 0.55;
  return 0.5;
}

/* ---- Infra ---- */
function computeInfrastructureGap(region: any): number | null {
  const f: number[] = [];
  if (isNum(region.infrastructure_score)) f.push(1 - clamp01(region.infrastructure_score));

  if (isNum(region.internet_speed_download) || isNum(region.internet_speed_upload)) {
    const d = Math.max(+region.internet_speed_download || 0, 0);
    const u = Math.max(+region.internet_speed_upload || 0, 0);
    const idx = (mbps: number) => {
      if (mbps <= 10) return 0.95;
      if (mbps <= 50) return lerp(0.95, 0.75, (mbps - 10) / 40);
      if (mbps <= 100) return lerp(0.75, 0.5, (mbps - 50) / 50);
      if (mbps <= 250) return lerp(0.5, 0.25, (mbps - 100) / 150);
      return 0.1;
    };
    const gap = clamp01(0.7 * idx(d) + 0.3 * idx(u));
    f.push(gap);
  }

  if (isNum(region.urban_population_percent)) {
    const u = clamp01(+region.urban_population_percent / 100);
    f.push(lerp(0.8, 0.1, u));
  }

  if (!f.length) return estimateInfrastructureGapByRegion(region);
  return mean(f);
}

function estimateInfrastructureGapByRegion(region: any): number {
  const c = (region.country || "").toLowerCase();
  const highIncome = [
    "united states",
    "canada",
    "australia",
    "new zealand",
    "japan",
    "south korea",
    "singapore",
    "germany",
    "france",
    "italy",
    "spain",
    "portugal",
    "netherlands",
    "belgium",
    "luxembourg",
    "austria",
    "sweden",
    "norway",
    "finland",
    "denmark",
    "ireland",
    "switzerland",
    "united kingdom",
  ];
  const lowInfra = [
    "nigeria",
    "ethiopia",
    "democratic republic of the congo",
    "mozambique",
    "madagascar",
    "niger",
    "chad",
    "mali",
    "burkina faso",
    "burundi",
    "sierra leone",
    "liberia",
    "guinea",
    "somalia",
    "afghanistan",
    "yemen",
  ];
  const moderateInfra = [
    "india",
    "pakistan",
    "bangladesh",
    "philippines",
    "indonesia",
    "vietnam",
    "myanmar",
    "cambodia",
    "kenya",
    "uganda",
    "tanzania",
    "ghana",
    "senegal",
    "zambia",
    "zimbabwe",
  ];
  if (highIncome.includes(c)) return 0.12;
  if (lowInfra.includes(c)) return 0.85;
  if (moderateInfra.includes(c)) return 0.6;
  return 0.35;
}

/* ---- Socio ---- */
function computeSocioeconomicVulnerability(region: any): number | null {
  const f: number[] = [];
  if (isNum(region.socioeconomic_score)) f.push(clamp01(region.socioeconomic_score));
  if (isNum(region.gdp_per_capita)) {
    const g = +region.gdp_per_capita;
    let v: number;
    if (g < 2000) v = 0.95;
    else if (g < 10000) v = lerp(0.95, 0.7, (g - 2000) / 8000);
    else if (g < 20000) v = lerp(0.7, 0.45, (g - 10000) / 10000);
    else if (g < 40000) v = lerp(0.45, 0.15, (g - 20000) / 20000);
    else v = 0.05;
    f.push(v);
  }
  if (isNum(region.urban_population_percent)) {
    const u = clamp01(+region.urban_population_percent / 100);
    const uV = 0.6 * (1 - Math.exp(-4 * Math.pow(u - 0.7, 2))) + 0.1;
    f.push(clamp01(uV));
  }
  if (!f.length) return estimateSocioeconomicVulnByRegion(region);
  return clamp01(mean(f));
}

function estimateSocioeconomicVulnByRegion(region: any): number {
  const c = (region.country || "").toLowerCase();
  const extreme = [
    "burundi",
    "south sudan",
    "somalia",
    "niger",
    "chad",
    "central african republic",
    "democratic republic of the congo",
    "mozambique",
    "madagascar",
    "malawi",
    "liberia",
    "sierra leone",
  ];
  const high = [
    "ethiopia",
    "uganda",
    "tanzania",
    "rwanda",
    "burkina faso",
    "mali",
    "guinea",
    "benin",
    "togo",
    "zambia",
    "zimbabwe",
    "haiti",
    "afghanistan",
    "yemen",
    "nepal",
    "bangladesh",
  ];
  const moderate = [
    "india",
    "pakistan",
    "philippines",
    "indonesia",
    "vietnam",
    "myanmar",
    "cambodia",
    "laos",
    "kenya",
    "ghana",
    "senegal",
    "nigeria",
    "cameroon",
  ];
  const lowHighIncome = [
    "united states",
    "canada",
    "australia",
    "new zealand",
    "japan",
    "south korea",
    "singapore",
    "germany",
    "france",
    "italy",
    "spain",
    "portugal",
    "netherlands",
    "belgium",
    "luxembourg",
    "austria",
    "sweden",
    "norway",
    "finland",
    "denmark",
    "ireland",
    "switzerland",
    "united kingdom",
  ];
  if (lowHighIncome.includes(c)) return 0.1;
  if (extreme.includes(c)) return 0.9;
  if (high.includes(c)) return 0.75;
  if (moderate.includes(c)) return 0.6;
  return 0.45;
}

/* ---- Air ---- */
function computeAirQualityScore(region: any): number | null {
  const f: number[] = [];
  if (isNum(region.air_quality_pm25)) {
    const pm = +region.air_quality_pm25;
    let r: number;
    if (pm < 5) r = 0.05;
    else if (pm < 15) r = lerp(0.05, 0.3, (pm - 5) / 10);
    else if (pm < 35) r = lerp(0.3, 0.55, (pm - 15) / 20);
    else if (pm < 55) r = lerp(0.55, 0.8, (pm - 35) / 20);
    else r = Math.min(1, 0.8 + (pm - 55) / 80);
    f.push(clamp01(r));
  }
  if (isNum(region.air_quality_no2)) {
    const n = +region.air_quality_no2;
    f.push(clamp01((n - 5) / 35));
  }
  if (!f.length) return estimateAirQualityByRegion(region);
  return clamp01(mean(f));
}

function estimateAirQualityByRegion(region: any): number {
  const c = (region.country || "").toLowerCase();
  const severe = ["india", "bangladesh", "pakistan", "china", "egypt", "nigeria"];
  const high = ["indonesia", "vietnam", "thailand", "philippines", "iran", "iraq", "turkey"];
  if (severe.includes(c)) return 0.8;
  if (high.includes(c)) return 0.6;
  return 0.4;
}

/* ---- Helpers ---- */
function getComponentBreakdown(region: any) {
  return {
    climateRisk: computeClimateRisk(region),
    infrastructureGap: computeInfrastructureGap(region),
    socioeconomicVuln: computeSocioeconomicVulnerability(region),
    airQuality: computeAirQualityScore(region),
  };
}

function jsonOk(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
function isNum(v: any) {
  return typeof v === "number" && Number.isFinite(v);
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}
function mean(arr: number[]) {
  return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0;
}
