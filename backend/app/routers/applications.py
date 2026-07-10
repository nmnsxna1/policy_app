import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional

from fastapi.responses import FileResponse
from app.core.database import get_db
from app.core.config import get_settings
from app.core.security import decode_access_token
from app.routers.deps import get_current_user, require_role
from app.services.application_service import ApplicationService
from app.schemas.application import ApplicationOut
from app.models.supporting_document import SupportingDocument
from app.repositories.supporting_document_repository import SupportingDocumentRepository

router = APIRouter(prefix="/applications", tags=["applications"])
settings = get_settings()


@router.post("/draft")
def create_draft(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user, "APPLICANT")
    service = ApplicationService(db)
    app = service.create_draft(current_user["user_id"])
    return {"id": app.id, "application_number": app.application_number, "status": app.status.value}


@router.post("/{app_id}/upload")
async def upload_pdf(
    app_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user, "APPLICANT")
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    os.makedirs(settings.upload_dir, exist_ok=True)
    file_path = os.path.join(settings.upload_dir, f"{app_id}_{file.filename}")
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    service = ApplicationService(db)
    try:
        result = service.upload_pdf(app_id, current_user["user_id"], file_path)
        return {"message": "PDF uploaded", "application_id": app_id, "pdf_path": file_path}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{app_id}/process-ai")
def process_ai(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user, "APPLICANT")
    service = ApplicationService(db)
    try:
        result = service.process_with_ai(app_id, current_user["user_id"])
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{app_id}/details")
def update_details(
    app_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user, "APPLICANT")
    service = ApplicationService(db)
    try:
        result = service.update_detail(app_id, current_user["user_id"], data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{app_id}/submit")
def submit_application(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user, "APPLICANT")
    service = ApplicationService(db)
    try:
        result = service.submit_application(app_id, current_user["user_id"])
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{app_id}/withdraw")
def withdraw_application(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user, "APPLICANT")
    service = ApplicationService(db)
    try:
        result = service.withdraw_application(app_id, current_user["user_id"])
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{app_id}/approve")
def approve_application(
    app_id: int,
    reason: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = current_user["role"]
    if role not in ("POLICY_MANAGER", "SENIOR_MANAGER"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    service = ApplicationService(db)
    try:
        result = service.approve_application(app_id, current_user["user_id"], role, reason)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{app_id}/reject")
def reject_application(
    app_id: int,
    reason: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = current_user["role"]
    if role not in ("POLICY_MANAGER", "SENIOR_MANAGER"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    service = ApplicationService(db)
    try:
        result = service.reject_application(app_id, current_user["user_id"], role, reason)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{app_id}/escalate")
def escalate_application(
    app_id: int,
    reason: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user, "POLICY_MANAGER")
    service = ApplicationService(db)
    try:
        result = service.escalate_application(app_id, current_user["user_id"], reason)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = ApplicationService(db)
    return service.get_dashboard(current_user["user_id"], current_user["role"])


# ---- Search endpoints must come before /{app_id} to avoid route conflicts ----


@router.get("/search/{query}")
def search_applications(
    query: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = current_user["role"]
    if role not in ("POLICY_MANAGER", "SENIOR_MANAGER"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    service = ApplicationService(db)
    return service.search_applications(query)


@router.get("/advanced-search")
def advanced_search_applications(
    query: str = Query(""),
    status: str = Query(""),
    risk_level: str = Query(""),
    policy_type: str = Query(""),
    date_from: str = Query(""),
    date_to: str = Query(""),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = current_user["role"]
    if role not in ("POLICY_MANAGER", "SENIOR_MANAGER"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    service = ApplicationService(db)
    return service.advanced_search(
        query=query, status=status, risk_level=risk_level,
        policy_type=policy_type, date_from=date_from, date_to=date_to,
    )


# ---- Parameterized routes ----


@router.get("/{app_id}")
def get_application(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = ApplicationService(db)
    try:
        return service.get_application_detail(app_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{app_id}/pdf")
def get_application_pdf(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = ApplicationService(db)
    try:
        detail = service.get_application_detail(app_id)
        pdf_path = detail["application"].get("pdf_path")
        if not pdf_path or not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="PDF not found")
        return FileResponse(pdf_path, media_type="application/pdf")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{app_id}/pdf-view")
def get_application_pdf_view(
    app_id: int,
    token: str,
    db: Session = Depends(get_db),
):
    """PDF endpoint for iframe - accepts token as query param"""
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    service = ApplicationService(db)
    try:
        detail = service.get_application_detail(app_id)
        pdf_path = detail["application"].get("pdf_path")
        if not pdf_path or not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="PDF not found")
        return FileResponse(pdf_path, media_type="application/pdf")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ---- Supporting Documents ----

SUPPORTED_DOC_TYPES = {"AADHAAR", "PAN", "INCOME", "OTHER"}


@router.post("/{app_id}/supporting-docs")
async def upload_supporting_doc(
    app_id: int,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user, "APPLICANT")
    if doc_type.upper() not in SUPPORTED_DOC_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported doc type. Must be one of: {', '.join(SUPPORTED_DOC_TYPES)}")
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    os.makedirs(settings.upload_dir, exist_ok=True)
    file_path = os.path.join(settings.upload_dir, f"support_{app_id}_{doc_type}_{file.filename}")
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    repo = SupportingDocumentRepository(db)
    doc = SupportingDocument(
        application_id=app_id,
        doc_type=doc_type.upper(),
        filename=file.filename,
        file_path=file_path,
    )
    repo.create(doc)
    db.commit()
    db.refresh(doc)
    return {"id": doc.id, "doc_type": doc.doc_type, "filename": doc.filename}


@router.get("/{app_id}/supporting-docs")
def list_supporting_docs(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = current_user["role"]
    if role not in ("APPLICANT", "POLICY_MANAGER", "SENIOR_MANAGER"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    repo = SupportingDocumentRepository(db)
    docs = repo.get_by_application_id(app_id)
    return [
        {
            "id": d.id,
            "application_id": d.application_id,
            "doc_type": d.doc_type,
            "filename": d.filename,
            "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
        }
        for d in docs
    ]


@router.get("/{app_id}/supporting-docs/{doc_id}/view")
def view_supporting_doc(
    app_id: int,
    doc_id: int,
    token: str,
    db: Session = Depends(get_db),
):
    """PDF view endpoint for supporting docs - accepts token as query param"""
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    repo = SupportingDocumentRepository(db)
    doc = repo.get_by_id_and_application(doc_id, app_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Supporting document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(doc.file_path, media_type="application/pdf")
