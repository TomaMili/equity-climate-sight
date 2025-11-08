"""
OpenAQ ETL Script - Fetch air quality data and update Supabase
Amazon Sustainability Data Initiative (ASDI) Integration

This script fetches real-time air quality data from OpenAQ API
and updates the climate_inequality_regions table in Supabase.

Requirements:
    pip install requests python-dotenv psycopg2-binary

Usage:
    python scripts/etl/openaq_etl.py

Environment Variables:
    SUPABASE_URL - Your Supabase project URL
    SUPABASE_SERVICE_KEY - Supabase service role key (for direct DB access)
    SUPABASE_DB_URL - PostgreSQL connection string (optional, for direct DB)
"""

import os
import requests
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# OpenAQ API Configuration
OPENAQ_API_BASE = "https://api.openaq.org/v2"

# Country mapping - ISO codes to names
COUNTRIES = {
    'DEU': 'Germany',
    'POL': 'Poland',
    'FRA': 'France',
    'ESP': 'Spain',
    'ITA': 'Italy',
    'GRC': 'Greece',
    'ROU': 'Romania',
    'BGR': 'Bulgaria',
    'GBR': 'United Kingdom',
    'NLD': 'Netherlands',
    'SWE': 'Sweden',
    'PRT': 'Portugal',
}

class OpenAQETL:
    def __init__(self):
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables")
    
    def fetch_country_air_quality(self, country_code: str, days_back: int = 7) -> Dict[str, Optional[float]]:
        """
        Fetch average PM2.5 and NO2 values for a country from OpenAQ
        
        Args:
            country_code: ISO 3166-1 alpha-3 country code
            days_back: Number of days to look back for data
            
        Returns:
            Dictionary with avg_pm25 and avg_no2 values
        """
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days_back)
        
        result = {
            'avg_pm25': None,
            'avg_no2': None,
            'measurement_count': 0
        }
        
        # Fetch PM2.5 data
        try:
            pm25_data = self._fetch_parameter_data(
                country_code, 
                'pm25', 
                start_date, 
                end_date
            )
            if pm25_data:
                result['avg_pm25'] = self._calculate_average(pm25_data)
                print(f"  ✓ {country_code} PM2.5: {result['avg_pm25']:.2f} µg/m³ ({len(pm25_data)} measurements)")
        except Exception as e:
            print(f"  ✗ Error fetching PM2.5 for {country_code}: {str(e)}")
        
        # Fetch NO2 data
        try:
            no2_data = self._fetch_parameter_data(
                country_code, 
                'no2', 
                start_date, 
                end_date
            )
            if no2_data:
                result['avg_no2'] = self._calculate_average(no2_data)
                print(f"  ✓ {country_code} NO2: {result['avg_no2']:.2f} µg/m³ ({len(no2_data)} measurements)")
        except Exception as e:
            print(f"  ✗ Error fetching NO2 for {country_code}: {str(e)}")
        
        return result
    
    def _fetch_parameter_data(
        self, 
        country_code: str, 
        parameter: str, 
        start_date: datetime, 
        end_date: datetime
    ) -> List[float]:
        """Fetch measurements for a specific parameter"""
        url = f"{OPENAQ_API_BASE}/measurements"
        
        params = {
            'country': country_code,
            'parameter': parameter,
            'date_from': start_date.strftime('%Y-%m-%d'),
            'date_to': end_date.strftime('%Y-%m-%d'),
            'limit': 10000,
            'order_by': 'datetime'
        }
        
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        measurements = []
        
        if 'results' in data:
            for result in data['results']:
                if 'value' in result and result['value'] is not None:
                    measurements.append(float(result['value']))
        
        return measurements
    
    def _calculate_average(self, values: List[float]) -> Optional[float]:
        """Calculate average, filtering outliers"""
        if not values:
            return None
        
        # Simple outlier removal - remove top/bottom 5%
        sorted_values = sorted(values)
        trim_count = max(1, len(sorted_values) // 20)
        trimmed = sorted_values[trim_count:-trim_count] if len(sorted_values) > 10 else sorted_values
        
        return sum(trimmed) / len(trimmed) if trimmed else None
    
    def update_supabase(self, region_code: str, air_quality_data: Dict[str, Optional[float]]):
        """Update Supabase database with new air quality data"""
        url = f"{self.supabase_url}/rest/v1/climate_inequality_regions"
        
        headers = {
            'apikey': self.supabase_key,
            'Authorization': f'Bearer {self.supabase_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        
        update_data = {}
        if air_quality_data['avg_pm25'] is not None:
            update_data['air_quality_pm25'] = round(air_quality_data['avg_pm25'], 2)
        if air_quality_data['avg_no2'] is not None:
            update_data['air_quality_no2'] = round(air_quality_data['avg_no2'], 2)
        
        if not update_data:
            print(f"  ⚠ No data to update for {region_code}")
            return
        
        update_data['last_updated'] = datetime.utcnow().isoformat()
        
        # Update using Supabase REST API
        params = {'region_code': f'eq.{region_code}'}
        response = requests.patch(
            url, 
            headers=headers, 
            params=params,
            json=update_data,
            timeout=10
        )
        
        if response.status_code in [200, 201, 204]:
            print(f"  ✓ Updated database for {region_code}")
        else:
            print(f"  ✗ Failed to update {region_code}: {response.status_code} - {response.text}")
    
    def run_etl(self, countries: Optional[List[str]] = None):
        """
        Run complete ETL process
        
        Args:
            countries: List of country codes to process (None = all)
        """
        if countries is None:
            countries = list(COUNTRIES.keys())
        
        print(f"\n{'='*60}")
        print(f"OpenAQ ETL - Starting data fetch at {datetime.utcnow().isoformat()}")
        print(f"{'='*60}\n")
        
        successful = 0
        failed = 0
        
        for country_code in countries:
            country_name = COUNTRIES.get(country_code, country_code)
            print(f"\n[{country_code}] Processing {country_name}...")
            
            try:
                # Fetch air quality data
                air_quality = self.fetch_country_air_quality(country_code)
                
                # Update database
                if air_quality['avg_pm25'] or air_quality['avg_no2']:
                    self.update_supabase(country_code, air_quality)
                    successful += 1
                else:
                    print(f"  ⚠ No data available for {country_code}")
                    failed += 1
                    
            except Exception as e:
                print(f"  ✗ Error processing {country_code}: {str(e)}")
                failed += 1
        
        print(f"\n{'='*60}")
        print(f"ETL Complete: {successful} successful, {failed} failed")
        print(f"{'='*60}\n")

def main():
    """Main entry point"""
    try:
        etl = OpenAQETL()
        etl.run_etl()
    except Exception as e:
        print(f"Fatal error: {str(e)}")
        exit(1)

if __name__ == "__main__":
    main()
