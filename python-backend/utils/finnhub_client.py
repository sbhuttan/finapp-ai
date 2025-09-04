"""
Finnhub API client for fetching real-time stock market data
"""

import os
import requests
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import time

class FinnhubClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('FINNHUB_API_KEY')
        self.base_url = 'https://finnhub.io/api/v1'
        self.session = requests.Session()
        if not self.api_key:
            raise ValueError("Finnhub API key is required. Set FINNHUB_API_KEY environment variable.")
    
    def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """Make a request to Finnhub API with error handling and rate limiting"""
        if params is None:
            params = {}
        
        params['token'] = self.api_key
        
        try:
            response = self.session.get(f"{self.base_url}/{endpoint}", params=params)
            response.raise_for_status()
            
            data = response.json()
            
            # Check for API errors
            if isinstance(data, dict) and data.get('error'):
                raise Exception(f"Finnhub API error: {data['error']}")
                
            return data
            
        except requests.exceptions.RequestException as e:
            print(f"Error making request to Finnhub: {e}")
            raise
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON response: {e}")
            raise
    
    def get_quote(self, symbol: str) -> Dict:
        """Get real-time quote data for a symbol"""
        try:
            return self._make_request('quote', {'symbol': symbol.upper()})
        except Exception as e:
            print(f"Error fetching quote for {symbol}: {e}")
            return {}
    
    def get_company_profile(self, symbol: str) -> Dict:
        """Get company profile information"""
        try:
            return self._make_request('stock/profile2', {'symbol': symbol.upper()})
        except Exception as e:
            print(f"Error fetching company profile for {symbol}: {e}")
            return {}
    
    def get_stock_candles(self, symbol: str, resolution: str = 'D', days_back: int = 30) -> Dict:
        """Get historical stock price data (candles)
        
        Args:
            symbol: Stock symbol
            resolution: Resolution (1, 5, 15, 30, 60, D, W, M)
            days_back: Number of days to go back
        """
        try:
            to_timestamp = int(time.time())
            from_timestamp = to_timestamp - (days_back * 24 * 60 * 60)
            
            return self._make_request('stock/candle', {
                'symbol': symbol.upper(),
                'resolution': resolution,
                'from': from_timestamp,
                'to': to_timestamp
            })
        except Exception as e:
            print(f"Error fetching candles for {symbol}: {e}")
            return {}
    
    def get_company_news(self, symbol: str, days_back: int = 7) -> List[Dict]:
        """Get recent company news"""
        try:
            to_date = datetime.now().strftime('%Y-%m-%d')
            from_date = (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%d')
            
            return self._make_request('company-news', {
                'symbol': symbol.upper(),
                'from': from_date,
                'to': to_date
            })
        except Exception as e:
            print(f"Error fetching news for {symbol}: {e}")
            return []
    
    def get_basic_financials(self, symbol: str) -> Dict:
        """Get basic financial metrics"""
        try:
            return self._make_request('stock/metric', {
                'symbol': symbol.upper(),
                'metric': 'all'
            })
        except Exception as e:
            print(f"Error fetching financials for {symbol}: {e}")
            return {}
    
    def get_earnings(self, symbol: str) -> List[Dict]:
        """Get earnings data"""
        try:
            return self._make_request('stock/earnings', {'symbol': symbol.upper()})
        except Exception as e:
            print(f"Error fetching earnings for {symbol}: {e}")
            return []
    
    def search_symbol(self, query: str) -> Dict:
        """Search for symbols"""
        try:
            return self._make_request('search', {'q': query})
        except Exception as e:
            print(f"Error searching for {query}: {e}")
            return {}
    
    def get_stock_overview(self, symbol: str) -> Dict:
        """Get comprehensive stock overview combining multiple endpoints"""
        try:
            # Fetch multiple data points concurrently
            quote = self.get_quote(symbol)
            profile = self.get_company_profile(symbol)
            financials = self.get_basic_financials(symbol)
            news = self.get_company_news(symbol, days_back=5)
            earnings = self.get_earnings(symbol)
            
            # Get historical data for chart
            history = self.get_stock_candles(symbol, resolution='D', days_back=180)
            
            return {
                'symbol': symbol.upper(),
                'quote': quote,
                'profile': profile,
                'financials': financials,
                'news': news[:10],  # Limit to 10 recent news items
                'earnings': earnings,
                'history': history,
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Error fetching stock overview for {symbol}: {e}")
            return {
                'symbol': symbol.upper(),
                'error': str(e),
                'last_updated': datetime.now().isoformat()
            }

# Global client instance
_finnhub_client = None

def get_finnhub_client() -> FinnhubClient:
    """Get or create a global Finnhub client instance"""
    global _finnhub_client
    if _finnhub_client is None:
        _finnhub_client = FinnhubClient()
    return _finnhub_client

# Convenience functions
def get_stock_quote(symbol: str) -> Dict:
    """Get stock quote data"""
    client = get_finnhub_client()
    return client.get_quote(symbol)

def get_stock_profile(symbol: str) -> Dict:
    """Get company profile"""
    client = get_finnhub_client()
    return client.get_company_profile(symbol)

def get_stock_overview(symbol: str) -> Dict:
    """Get comprehensive stock overview"""
    client = get_finnhub_client()
    return client.get_stock_overview(symbol)

def search_stocks(query: str) -> Dict:
    """Search for stocks"""
    client = get_finnhub_client()
    return client.search_symbol(query)
