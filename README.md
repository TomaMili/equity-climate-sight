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
- Climate risk indicators
- Infrastructure accessibility scores  
- Socioeconomic vulnerability metrics
- Air quality data (PM2.5)
- Internet connectivity speeds
- Population demographics

## 🛠️ Tech Stack

### Frontend
- **React** with TypeScript
- **Mapbox GL JS** for interactive mapping
- **H3-js** for hexagonal spatial indexing
- **Tailwind CSS** for styling
- **shadcn/ui** component library

### Backend
- **Lovable Cloud** (Supabase-powered)
- **PostgreSQL + PostGIS** for spatial data storage
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
- Copy your public token from the dashboard

4. **Start the development server**
```bash
npm run dev
```

5. **Enter your Mapbox token**
- Open the app in your browser
- Paste your Mapbox public token when prompted
- Click "Launch Map"

## 🗺️ How to Use

1. **View the map**: The application loads with a choropleth visualization of European regions
2. **Click regions**: Click on any hexagon to see detailed climate inequality metrics
3. **Read AI insights**: Each region displays an AI-generated analysis of its vulnerability factors
4. **Check statistics**: The sidebar shows global statistics including average CII and high-risk area counts
5. **Understand the legend**: Use the color-coded legend to interpret CII scores (0 = low inequality, 1 = critical)

## 📊 Climate Inequality Index (CII)

The CII is calculated using:
- **Climate Risk Score** (0-1): Environmental exposure to climate hazards
- **Infrastructure Score** (0-1): Access to roads, internet, and essential services
- **Socioeconomic Score** (0-1): Vulnerability based on economic and social factors

**Interpretation:**
- 0.0 - 0.3: Low inequality (green)
- 0.3 - 0.5: Low-medium inequality (light green)
- 0.5 - 0.7: Medium inequality (yellow)
- 0.7 - 0.9: High inequality (orange)
- 0.9 - 1.0: Critical inequality (red)

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
