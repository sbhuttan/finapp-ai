#!/usr/bin/env python3
"""
Test script for technical indicator extraction
"""
import re
from typing import Dict

def extract_technical_indicators(text: str) -> Dict:
    """Extract technical indicators from analysis text"""
    indicators = {}
    
    print(f"🔍 Extracting technical indicators from text length: {len(text)}")
    
    # Enhanced patterns with more variations - order matters for moving averages!
    patterns = {
        "RSI": [
            r"RSI[:\s]*(\d+\.?\d*)",
            r"relative.*strength.*index[:\s]*(\d+\.?\d*)",
            r"RSI.*?(\d+\.?\d*)",
            r"rsi[:\s]*(\d+\.?\d*)"
        ],
        "MACD": [
            r"MACD[:\s]*([+-]?\d+\.?\d*)",
            r"moving.*average.*convergence[:\s]*([+-]?\d+\.?\d*)",
            r"MACD.*?([+-]?\d+\.?\d*)",
            r"macd[:\s]*([+-]?\d+\.?\d*)"
        ],
        "Support": [
            r"support[:\s]*level[:\s]*\$?(\d+\.?\d*)",
            r"support[:\s]*\$?(\d+\.?\d*)",
            r"support.*level[:\s]*\$?(\d+\.?\d*)",
            r"key.*support[:\s]*\$?(\d+\.?\d*)",
            r"support.*?[:\s]*\$?(\d+\.?\d*)"
        ],
        "Resistance": [
            r"resistance[:\s]*level[:\s]*\$?(\d+\.?\d*)",
            r"resistance[:\s]*\$?(\d+\.?\d*)",
            r"resistance.*level[:\s]*\$?(\d+\.?\d*)",
            r"key.*resistance[:\s]*\$?(\d+\.?\d*)",
            r"resistance.*?[:\s]*\$?(\d+\.?\d*)"
        ],
        # Process 200-day first to avoid 50-day pattern matching 200-day text
        "200_day_ma": [
            r"200[- ]?day.*?moving average[:\s]*\$?(\d+\.?\d*)",
            r"200[- ]?day.*?MA[:\s]*\$?(\d+\.?\d*)",
            r"200.*?day.*?average[:\s]*\$?(\d+\.?\d*)",
            r"two.*?hundred.*?day.*?moving.*?average[:\s]*\$?(\d+\.?\d*)"
        ],
        "50_day_ma": [
            r"50[- ]?day.*?moving average[:\s]*\$?(\d+\.?\d*)",
            r"50[- ]?day.*?MA[:\s]*\$?(\d+\.?\d*)",
            r"50.*?day.*?average[:\s]*\$?(\d+\.?\d*)",
            r"fifty.*?day.*?moving.*?average[:\s]*\$?(\d+\.?\d*)"
        ]
    }
    
    # Try multiple patterns for each indicator
    for indicator, pattern_list in patterns.items():
        found = False
        for i, pattern in enumerate(pattern_list):
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                try:
                    value = float(match.group(1))
                    indicators[indicator] = value
                    print(f"✅ Found {indicator}: {value} (pattern {i+1})")
                    found = True
                    break
                except (ValueError, IndexError) as e:
                    print(f"⚠️ Error parsing {indicator} value: {e}")
                    continue
        
        if not found:
            print(f"❌ Could not find {indicator} in text")
    
    print(f"🎯 Final extracted indicators: {indicators}")
    return indicators

if __name__ == "__main__":
    # Test the function
    test_text = """
    Technical Analysis shows:
    - RSI: 67.5 indicating moderate momentum
    - MACD: -0.45 showing bearish divergence  
    - Support Level: $145.20 based on recent consolidation
    - Resistance Level: $162.80 from previous highs
    - 50-day moving average: $152.35 trending upward
    - 200-day moving average: $148.90 providing long-term support
    """
    
    print("Testing technical indicator extraction...")
    result = extract_technical_indicators(test_text)
    print("\nTest result:", result)
    
    # Check if we got the right values
    expected = {
        'RSI': 67.5,
        'MACD': -0.45,
        'Support': 145.20,
        'Resistance': 162.80,
        '50_day_ma': 152.35,
        '200_day_ma': 148.90
    }
    
    print("\nExpected values:", expected)
    print("Actual values:  ", result)
    
    # Check accuracy
    correct = 0
    for key, expected_val in expected.items():
        if key in result and abs(result[key] - expected_val) < 0.01:
            print(f"✅ {key}: Correct")
            correct += 1
        else:
            print(f"❌ {key}: Expected {expected_val}, got {result.get(key, 'Missing')}")
    
    print(f"\nAccuracy: {correct}/{len(expected)} correct")
    if correct == len(expected):
        print("🎉 All indicators extracted correctly!")
    else:
        print("⚠️ Some indicators need pattern adjustments")
