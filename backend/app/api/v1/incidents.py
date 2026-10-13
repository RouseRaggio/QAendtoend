from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Bug, Improvement, Module, TestCase, User
from app.schemas.schemas import BugResponse, ImprovementResponse, EvidenceResponse
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.get("/bugs", response_model=List[BugResponse])
def get_bugs(project_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Bug)
    if project_id:
        q = q.filter(Bug.project_id == project_id)
    bugs = q.all()
    res = []
    for b in bugs:
        mod = db.query(Module).filter(Module.id == b.module_id).first() if b.module_id else None
        tc = db.query(TestCase).filter(TestCase.id == b.test_case_id).first() if b.test_case_id else None
        evs = [EvidenceResponse.from_orm(ev) for ev in b.evidences]
        res.append(BugResponse(
            id=b.id,
            code=b.code,
            title=b.title,
            description=b.description,
            project_id=b.project_id,
            project_name=b.project.name if b.project else None,
            module_name=mod.name if mod else None,
            test_case_id=b.test_case_id,
            test_case_code=tc.code if tc else None,
            test_result_id=b.test_result_id,
            execution_id=b.execution_id,
            steps_to_reproduce=b.steps_to_reproduce,
            severity=b.severity,
            priority=b.priority,
            status=b.status,
            assignee_name=b.assignee.full_name if b.assignee else None,
            created_at=b.created_at,
            evidences=evs
        ))
    return res

@router.get("/improvements", response_model=List[ImprovementResponse])
def get_improvements(project_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Improvement)
    if project_id:
        q = q.filter(Improvement.project_id == project_id)
    imps = q.all()
    res = []
    for m in imps:
        mod = db.query(Module).filter(Module.id == m.module_id).first() if m.module_id else None
        tc = db.query(TestCase).filter(TestCase.id == m.test_case_id).first() if m.test_case_id else None
        evs = [EvidenceResponse.from_orm(ev) for ev in m.evidences]
        res.append(ImprovementResponse(
            id=m.id,
            code=m.code,
            title=m.title,
            description=m.description,
            project_id=m.project_id,
            module_name=mod.name if mod else None,
            test_case_code=tc.code if tc else None,
            test_result_id=m.test_result_id,
            priority=m.priority,
            status=m.status,
            created_at=m.created_at,
            evidences=evs
        ))
    return res
