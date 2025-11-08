# AI Equity Mapper

**Team NOPE** - International hAIckathon 2025  
**Challenge Theme:** Reduced Inequalities + Climate Action

## 🎯 Project Overview

AI Equity Mapper is an interactive web application that visualizes climate inequality across regions using the Climate Inequality Index (CII). It combines data from Amazon Sustainability Data Initiative (ASDI) with AI-powered insights to help policymakers and researchers understand and address climate-related disparities.

## 🚀 Features

### Core MVP Features (Implemented)
- ✅ **Interactive Mapbox visualization** with hexagonal H3 grid overlay
- ✅ **Climate Inequality Index (CII)** calculation and visualization (0-1 scale)
- ✅ **Choropleth heat map** with color-coded regions based on risk levels
- ✅ **AI-powered insights** using Lovable AI (Gemini 2.5 Flash) for region analysis
- ✅ **Sidebar with region details** showing climate risk, infrastructure, and socioeconomic scores
- ✅ **Global statistics panel** displaying average CII, high-risk areas, and critical regions
- ✅ **Interactive legend** explaining the CII color scale
- ✅ **Sample ASDI dataset integration** with 23 European regions

### Data Integrated
Real structure aligned with ASDI datasets:
- **OpenAQ**: PM2.5 and NO₂ air quality measurements
- **NASA OMI**: Nitrogen dioxide satellite data
- **Ookla**: Download/upload internet speeds
- **ERA5**: Temperature and precipitation averages  
- **Drought/Flood Data**: Historical climate event indices
- **World Bank**: GDP per capita, urbanization rates

## 🛠️ Tech Stack

### Frontend
- **React** with TypeScript
- **Mapbox GL JS** for interactive mapping with country polygons
- **Tailwind CSS** for styling
- **shadcn/ui** component library

### Backend
- **Lovable Cloud** (Supabase-powered) with PostGIS
- **PostgreSQL + PostGIS** for spatial data and country geometries
- **Edge Functions** for serverless AI processing

### AI/ML
- **Lovable AI Gateway** with Gemini 2.5 Flash
- Natural language insights generation
- Climate inequality pattern analysis

## 📦 Setup Instructions

1. **Clone the repository**
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. **Install dependencies**
```bash
npm install
```

3. **Get a Mapbox token**
- Visit [mapbox.com](https://mapbox.com)
- Create a free account
- Copy your **public token** (starts with `pk.`)

4. **Start the development server**
```bash
npm run dev
```

5. **Launch the app**
- Open in your browser
- Paste your Mapbox public token
- Click "Launch Map"

## 🗺️ How to Use

1. **View the map**: Interactive visualization of 12 European countries with real boundaries
2. **Click regions**: Click on any country to see detailed CII metrics and ASDI data
3. **Read AI insights**: AI generates analysis using Gemini 2.5 Flash for each selected region
4. **Check statistics**: Sidebar shows aggregate metrics across all mapped regions
5. **Understand colors**: Green = low inequality, Yellow = medium, Red = critical

## 🗺️ Map Features

- **Colored Country Polygons**: Each country colored by its CII score
- **Interactive Selection**: Click countries to highlight and view details
- **Dark Theme Map**: Mapbox Dark style optimized for data visualization
- **Responsive Controls**: Pan, zoom, and navigate with standard map controls

## 📊 Climate Inequality Index (CII)

The CII is calculated using AI-weighted factors from ASDI datasets:
- **Climate Risk Score** (0-1): Environmental exposure from ERA5 temperature, precipitation, drought indices
- **Infrastructure Score** (0-1): Access measured via Ookla internet speeds, OpenStreetMap data
- **Socioeconomic Score** (0-1): Vulnerability from World Bank economic indicators

**Interpretation:**
- 0.0 - 0.3: Low inequality (green) - Well-prepared regions
- 0.3 - 0.5: Low-medium inequality (light green) - Moderate resilience
- 0.5 - 0.7: Medium inequality (yellow) - Vulnerable populations
- 0.7 - 0.9: High inequality (orange) - Significant disparities
- 0.9 - 1.0: Critical inequality (red) - Urgent intervention needed

## 📈 ASDI Data Sources & Integration

This application integrates data from the [Amazon Sustainability Data Initiative (ASDI)](https://registry.opendata.aws/collab/asdi/):

### Currently Integrated (Sample Data)
The MVP uses realistic sample data modeled after these ASDI datasets:

1. **OpenAQ** - Global air quality (PM2.5, NO₂)
   - Registry: `registry.opendata.aws/openaq`
   - 12 European countries with hourly measurements

2. **NASA OMI/Aura NO₂** - Satellite-based nitrogen dioxide
   - Registry: `registry.opendata.aws/nasa-omi-no2`
   - 0.25° resolution tropospheric columns

3. **Ookla Speedtest** - Internet connectivity metrics
   - Registry: `registry.opendata.aws/ookla-open-data`
   - Download/upload speeds at ~610m resolution

4. **ERA5 Climate Reanalysis** - Temperature & precipitation
   - Sourced via ASDI catalogue
   - Monthly averages, 0.25° resolution

5. **Global Drought & Flood Catalogue** - Historical climate events
   - Drought indices (1950-2016)
   - Flood risk scoring

6. **World Bank Indicators** - Socioeconomic metrics
   - GDP per capita, urban population %
   - Available through ASDI partner datasets

### ETL Pipeline for Real ASDI Data

To integrate live ASDI data, follow this workflow:

```python
# Example: Process OpenAQ data
import requests
import psycopg2
from datetime import datetime, timedelta

def fetch_openaq_data(country_code, start_date, end_date):
    """Fetch air quality data from OpenAQ API"""
    url = "https://api.openaq.org/v2/measurements"
    params = {
        'country': country_code,
        'date_from': start_date,
        'date_to': end_date,
        'parameter': 'pm25',
        'limit': 10000
    }
    response = requests.get(url, params=params)
    return response.json()

def calculate_regional_average(measurements, region_geom):
    """Calculate regional average PM2.5"""
    # Filter measurements within region boundary
    # Weight by measurement quality and temporal coverage
    return average_pm25

# Insert into Supabase
def update_climate_data(region_code, pm25_value):
    # Use Supabase client or direct SQL
    supabase.table('climate_inequality_regions')
        .update({'air_quality_pm25': pm25_value})
        .eq('region_code', region_code)
        .execute()
```

### Data Processing Steps

1. **Download from ASDI S3 Buckets**
   ```bash
   aws s3 ls s3://openaq-fetches/realtime-gzipped/ --no-sign-request
   aws s3 sync s3://ookla-open-data/shapefiles/ ./data/ookla/ --no-sign-request
   ```

2. **Spatial Aggregation**
   - Use PostGIS to aggregate point measurements to country polygons
   - Weight by population density or measurement quality
   - Calculate temporal averages (annual, seasonal)

3. **CII Calculation**
   - Normalize all scores to 0-1 range
   - Apply AI model to weight factors dynamically
   - Store results in `climate_inequality_regions` table

### Future ASDI Integration Roadmap

- **Phase 2**: Live OpenAQ and Ookla data ingestion
- **Phase 3**: Satellite imagery processing (Sentinel-2, Landsat-8)
- **Phase 4**: Real-time climate predictions using ERA5 forecasts
- **Phase 5**: ML-based anomaly detection on ASDI time series

For complete ASDI dataset catalog: https://registry.opendata.aws/collab/asdi/

## 🤖 AI Features

- **Natural language summaries**: Each region gets a concise AI analysis
- **Pattern recognition**: AI identifies relationships between climate risk and infrastructure
- **Actionable recommendations**: Insights focus on policy-relevant interventions
- **Real-time generation**: Insights generated on-demand using Lovable AI

## 📈 Data Sources (ASDI)

This MVP uses sample data modeled after:
- **OpenAQ**: Air quality measurements (PM2.5)
- **ERA5**: Climate reanalysis data
- **Ookla**: Internet connectivity speeds
- **World Bank**: Socioeconomic indicators

*Note: Current version uses synthetic data for demonstration. Production version would integrate live ASDI datasets.*

## 🔒 Security & Privacy

- All data is publicly accessible (no authentication required)
- RLS policies ensure data integrity
- Edge functions use secure environment variables
- No personal data collection

## 🎓 Team Information

**Team NOPE**
- Karlo Šiljevinac - [LinkedIn](https://www.linkedin.com/in/siljevinackarlo/)
- Toma Milićević - [LinkedIn](https://www.linkedin.com/in/toma-mili%C4%87evi%C4%87/)

## 📝 License

This project was created for the International hAIckathon 2025.

## 🙏 Acknowledgments

- Amazon Sustainability Data Initiative (ASDI) for open climate datasets
- Lovable for the AI Gateway and Cloud infrastructure
- Mapbox for mapping technology
- Uber H3 for hexagonal spatial indexing

---

Built with ❤️ using [Lovable](https://lovable.dev)
