#!/usr/bin/env python3
"""
Simple pattern test for moving averages
"""
import re

def test_ma_patterns():
    # Test text with proper formatting
    test_lines = [
        "- 50-day moving average: $152.35 trending upward",
        "- 200-day moving average: $148.90 providing long-term support"
    ]
    
    patterns = {
        "200_day_ma": r"200[- ]?day.*moving average[:\s]*\$?(\d+\.?\d*)",
        "50_day_ma": r"50[- ]?day.*moving average[:\s]*\$?(\d+\.?\d*)"
    }
    
    print("Testing individual lines:")
    for line in test_lines:
        print(f"\nLine: {line}")
        for name, pattern in patterns.items():
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                print(f"  ✅ {name}: {match.group(1)}")
            else:
                print(f"  ❌ {name}: No match")
    
    # Test full text
    full_text = "\n".join(test_lines)
    print(f"\nFull text: {full_text}")
    print("\nTesting full text:")
    
    for name, pattern in patterns.items():
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            print(f"  ✅ {name}: {match.group(1)}")
        else:
            print(f"  ❌ {name}: No match")

if __name__ == "__main__":
    test_ma_patterns()
