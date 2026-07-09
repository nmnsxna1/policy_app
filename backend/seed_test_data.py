import os
from app.core.database import SessionLocal
from app.services.application_service import ApplicationService
from app.repositories.user_repository import UserRepository
from app.repositories.application_repository import ApplicationRepository
from app.models.application import ApplicationStatus

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Minimal valid 1-page PDFs with different applicant data
PDFS = [
    {
        "filename": "app_rahul.pdf",
        "text": "Policy Application: Rahul Sharma PAN ABCDE1234F Aadhaar 123456789012 "
                "Email rahul@example.com Phone 9876543210 Occupation Engineer "
                "Employer Acme Corp Annual Income 1200000 Monthly Income 100000 "
                "Coverage Amount 5000000 Policy Type Home Credit Score 780",
    },
    {
        "filename": "app_priya.pdf",
        "text": "Policy Application: Priya Iyer PAN PQRST5678L Aadhaar 234567890123 "
                "Email priya@example.com Phone 8765432109 Occupation Doctor "
                "Employer City Hospital Annual Income 3000000 Monthly Income 250000 "
                "Coverage Amount 2000000 Policy Type Health Credit Score 810",
    },
    {
        "filename": "app_amit.pdf",
        "text": "Policy Application: Amit Kumar PAN LMNOP9012Q Aadhaar 345678901234 "
                "Email amit@example.com Phone 7654321098 Occupation Student "
                "Employer None Annual Income 200000 Monthly Income 16000 "
                "Coverage Amount 1500000 Policy Type Car Credit Score 590",
    },
]


def make_pdf(path: str, text: str):
    pdf = f"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length {len(text)}>>stream
BT /F1 12 Tf 50 700 Td ({text}) Tj ET
endstream endobj
xref 0 6 0000000000 65535 f 0000000009 00000 n 0000000058 00000 n 0000000115 00000 n 0000000228 00000 n 0000000305 00000 n
trailer<</Size 6/Root 1 0 R>>
startxref 500
%%EOF
"""
    with open(path, "wb") as f:
        f.write(pdf.encode())


def main():
    db = SessionLocal()
    user_repo = UserRepository(db)
    applicant = user_repo.get_by_username("applicant")
    manager = user_repo.get_by_username("manager")
    assert applicant and manager, "seed users missing"

    for i, spec in enumerate(PDFS):
        path = os.path.join(UPLOAD_DIR, spec["filename"])
        make_pdf(path, spec["text"])

        svc = ApplicationService(db)
        app = svc.create_draft(applicant.id)
        svc.upload_pdf(app.id, applicant.id, path)
        svc.process_with_ai(app.id, applicant.id)

        # Move straight into the manager worklist (test seeding bypasses the
        # applicant-side "resolve all validation errors" gate).
        app_repo = ApplicationRepository(db)
        app = app_repo.get_by_id(app.id)
        app.status = ApplicationStatus.PENDING_PM_REVIEW
        app.submitted_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
        db.commit()
        print(f"[{i+1}] {app.application_number} -> {app.status.value} (id={app.id})")

        # Escalate the 3rd one so it also shows for the Senior Manager
        if i == 2:
            svc.escalate_application(app.id, manager.id, "High loan vs low income, manual review needed")
            print(f"    escalated -> {app.status.value}")

    db.close()
    print("Seed complete.")


if __name__ == "__main__":
    main()
