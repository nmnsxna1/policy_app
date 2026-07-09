from typing import Tuple, List


def assess_risk(detail: dict, validation_flags: List[dict]) -> Tuple[str, str]:
    score = 0
    reasons = []

    # Coverage amount vs income
    annual_income = detail.get("annual_income")
    coverage_amount = detail.get("coverage_amount")
    if annual_income and coverage_amount:
        try:
            ratio = float(coverage_amount) / float(annual_income)
            if ratio > 8:
                score += 30
                reasons.append("Coverage amount is very high relative to annual income")
            elif ratio > 5:
                score += 15
                reasons.append("Coverage amount is high relative to annual income")
        except (ValueError, TypeError):
            pass

    # Low salary
    if annual_income is not None:
        try:
            if float(annual_income) < 200000:
                score += 20
                reasons.append("Annual income is below 2 Lakhs")
            elif float(annual_income) < 500000:
                score += 10
                reasons.append("Annual income is below 5 Lakhs")
        except (ValueError, TypeError):
            pass

    # Validation failures count
    unresolved_errors = [f for f in validation_flags if f.get("severity") == "ERROR" and not f.get("resolved")]
    if len(unresolved_errors) > 5:
        score += 25
        reasons.append(f"Multiple validation errors ({len(unresolved_errors)} unresolved)")
    elif len(unresolved_errors) > 2:
        score += 10
        reasons.append(f"Several validation errors ({len(unresolved_errors)} unresolved)")

    # Credit score
    credit_score = detail.get("credit_score")
    if credit_score is not None:
        try:
            cs = int(credit_score)
            if cs < 600:
                score += 30
                reasons.append(f"Poor credit score: {cs}")
            elif cs < 700:
                score += 15
                reasons.append(f"Below average credit score: {cs}")
        except (ValueError, TypeError):
            pass

    # Age
    age = detail.get("age")
    if age is not None:
        try:
            if int(age) > 55:
                score += 5
                reasons.append("Applicant age is above 55")
        except (ValueError, TypeError):
            pass

    if score >= 50:
        level = "HIGH"
    elif score >= 25:
        level = "MEDIUM"
    else:
        level = "LOW"

    explanation = "; ".join(reasons) if reasons else "No significant risk factors identified"
    return level, explanation
