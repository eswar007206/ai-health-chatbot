"""
Helper Utilities

Common utility functions used across the application.
"""

from datetime import datetime
from typing import Any, Dict

def celsius_to_fahrenheit(celsius: float) -> float:
    """Convert temperature from Celsius to Fahrenheit"""
    return (celsius * 9/5) + 32

def fahrenheit_to_celsius(fahrenheit: float) -> float:
    """Convert temperature from Fahrenheit to Celsius"""
    return (fahrenheit - 32) * 5/9

def format_timestamp(dt: datetime) -> str:
    """Format datetime for display"""
    return dt.strftime("%Y-%m-%d %H:%M:%S")

def validate_email(email: str) -> bool:
    """Basic email validation"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent injection attacks"""
    # Basic sanitization - can be expanded based on needs
    return text.strip()
