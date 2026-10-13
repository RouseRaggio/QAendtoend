import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Evidence, User
from app.schemas.schemas import EvidenceResponse
from app.api.v1.auth import get_current_user
from app.services.storage import StorageService

router = APIRouter(prefix="/evidence", tags=["Evidence"])

@router.get("/{evidence_id}/file")
def get_evidence_file(evidence_id: int, db: Session = Depends(get_db)):
    ev = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not ev or not os.path.exists(ev.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(ev.file_path, media_type=ev.content_type, filename=ev.file_name)

@router.delete("/{evidence_id}")
def delete_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ev = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    if os.path.exists(ev.file_path):
        try:
            os.remove(ev.file_path)
        except Exception:
            pass
    db.delete(ev)
    db.commit()
    return {"message": "Evidence deleted"}
