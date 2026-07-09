import re
from typing import List, Tuple

from app.core.config import get_settings

settings = get_settings()

REQUIRED_FIELDS = [
    "full_name", "dob", "age", "gender", "pan", "aadhaar",
    "email", "phone", "occupation", "annual_income",
    "coverage_amount", "policy_type",
]


def validate_applicant_detail(data: dict) -> List[dict]:
    flags = []

    # Required fields
    for field in REQUIRED_FIELDS:
        val = data.get(field)
        if val is None or (isinstance(val, str) and val.strip() == ""):
            flags.append({
                "field_name": field,
                "message": f"{field.replace('_', ' ').title()} is required",
                "severity": "ERROR",
            })

    # Age validation
    age = data.get("age")
    if age is not None:
        try:
            age_val = int(age)
            if age_val < 21 or age_val > 60:
                flags.append({
                    "field_name": "age",
                    "message": "Age must be between 21 and 60",
                    "severity": "ERROR",
                })
        except (ValueError, TypeError):
            flags.append({
                "field_name": "age",
                "message": "Age must be a valid number",
                "severity": "ERROR",
            })

    # PAN format: ABCDE1234F
    pan = data.get("pan")
    if pan and isinstance(pan, str):
        if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", pan.strip().upper()):
            flags.append({
                "field_name": "pan",
                "message": "PAN must be in format ABCDE1234F",
                "severity": "ERROR",
            })

    # Aadhaar format: 12 digits (allow spaces/hyphens, strip them)
    aadhaar = data.get("aadhaar")
    if aadhaar and isinstance(aadhaar, str):
        cleaned = re.sub(r"[\s\-]", "", aadhaar)
        if not re.match(r"^\d{12}$", cleaned):
            flags.append({
                "field_name": "aadhaar",
                "message": "Aadhaar must be exactly 12 digits (enter 12 numbers)",
                "severity": "ERROR",
            })

    # Email format
    email = data.get("email")
    if email and isinstance(email, str):
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email.strip()):
            flags.append({
                "field_name": "email",
                "message": "Invalid email format",
                "severity": "ERROR",
            })

    # Phone format: 10 digits (allow +91 prefix, spaces, hyphens, parens)
    phone = data.get("phone")
    if phone and isinstance(phone, str):
        cleaned = re.sub(r"[\s\-\(\)\+]", "", phone)
        # Remove leading '91' country code if present (India)
        if cleaned.startswith("91") and len(cleaned) == 12:
            cleaned = cleaned[2:]
        if not re.match(r"^\d{10}$", cleaned):
            flags.append({
                "field_name": "phone",
                "message": "Phone must be exactly 10 digits (e.g. 9876543210)",
                "severity": "ERROR",
            })

    # Salary positive
    annual_income = data.get("annual_income")
    if annual_income is not None:
        try:
            if float(annual_income) <= 0:
                flags.append({
                    "field_name": "annual_income",
                    "message": "Annual income must be positive",
                    "severity": "ERROR",
                })
        except (ValueError, TypeError):
            flags.append({
                "field_name": "annual_income",
                "message": "Annual income must be a valid number",
                "severity": "ERROR",
            })

    monthly_income = data.get("monthly_income")
    if monthly_income is not None:
        try:
            if float(monthly_income) <= 0:
                flags.append({
                    "field_name": "monthly_income",
                    "message": "Monthly income must be positive",
                    "severity": "ERROR",
                })
        except (ValueError, TypeError):
            flags.append({
                "field_name": "monthly_income",
                "message": "Monthly income must be a valid number",
                "severity": "ERROR",
            })

    # Coverage amount positive
    coverage_amount = data.get("coverage_amount")
    if coverage_amount is not None:
        try:
            coverage_val = float(coverage_amount)
            if coverage_val <= 0:
                flags.append({
                    "field_name": "coverage_amount",
                    "message": "Coverage amount must be positive",
                    "severity": "ERROR",
                })
        except (ValueError, TypeError):
            flags.append({
                "field_name": "coverage_amount",
                "message": "Coverage amount must be a valid number",
                "severity": "ERROR",
            })

    # Coverage amount <= multiplier * annual income
    if coverage_amount is not None and annual_income is not None:
        try:
            if float(coverage_amount) > settings.loan_multiplier * float(annual_income):
                flags.append({
                    "field_name": "coverage_amount",
                    "message": f"Coverage amount exceeds {settings.loan_multiplier}x annual income limit",
                    "severity": "ERROR",
                })
        except (ValueError, TypeError):
            pass

    # Gender validation
    gender = data.get("gender")
    if gender and isinstance(gender, str):
        if gender.strip().upper() not in ("MALE", "FEMALE", "OTHER"):
            flags.append({
                "field_name": "gender",
                "message": "Gender must be Male, Female, or Other",
                "severity": "WARNING",
            })

    # Policy type validation
    policy_type = data.get("policy_type")
    if policy_type and isinstance(policy_type, str):
        if policy_type.strip().upper() not in ("HEALTH", "CAR", "LIFE", "HOME", "TRAVEL", "OTHER"):
            flags.append({
                "field_name": "policy_type",
                "message": "Policy type must be Health, Car, Life, Home, Travel, or Other",
                "severity": "WARNING",
            })

    return flags
