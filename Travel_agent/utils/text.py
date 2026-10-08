from __future__ import annotations
import re

def clean_text(text: str) -> str:
    """Normalizes whitespace and strips control characters."""
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_phone_number(text: str) -> str:
    """Extracts a 10-digit or 12-digit Indian phone number from text."""
    matches = re.findall(r'(?:\+?91[\-\s]?)?[6-9]\d{9}', text)
    if matches:
        digits = re.sub(r'\D', '', matches[0])
        if len(digits) == 10:
            return f"+91{digits}"
        elif len(digits) == 12 and digits.startswith("91"):
            return f"+{digits}"
    return text.strip()

def format_currency_inr(amount: float | int) -> str:
    """Formats amount as INR currency (e.g. ₹5,499)."""
    return f"₹{amount:,.0f}"
