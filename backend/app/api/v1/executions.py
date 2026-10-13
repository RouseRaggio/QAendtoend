import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    TestExecution, TestResult, TestCase, Evidence, Bug, Improvement,
    TestStatus, SeverityLevel, TestPriority, BugStatus, User, UserStory, Project
)
from datetime import datetime
import os
from app.schemas.schemas import (
    ExecutionCreate, ExecutionResponse, ExecutionDetailResponse,
    ExecutionCaseItemResponse, TestResultResponse, EvidenceResponse
)
from app.api.v1.auth import get_current_user
from app.services.storage import StorageService

router = APIRouter(prefix="/executions", tags=["Executions"])

def _calculate_execution_stats(e: TestExecution) -> dict:
    results = e.results or []
    total = len(results)
    passed = sum(1 for r in results if r.status == TestStatus.PASSED)
    bugs = sum(1 for r in results if r.status == TestStatus.BUG)
    improvements = sum(1 for r in results if r.status == TestStatus.IMPROVEMENT)
    blocked = sum(1 for r in results if r.status == TestStatus.BLOCKED)
    in_progress = sum(1 for r in results if r.status == TestStatus.IN_PROGRESS)
    not_executed = sum(1 for r in results if r.status == TestStatus.NOT_EXECUTED)
    executed = total - not_executed - in_progress
    pct = round((executed / total * 100), 1) if total > 0 else 0.0
    return {
        "total": total,
        "passed": passed,
        "bugs": bugs,
        "improvements": improvements,
        "blocked": blocked,
        "in_progress": in_progress,
        "pending": not_executed,
        "executed": executed,
        "progress_percentage": pct
    }

@router.get("", response_model=List[ExecutionResponse])
def get_executions(project_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(TestExecution)
    if project_id:
        query = query.filter(TestExecution.project_id == project_id)
    executions = query.order_by(TestExecution.id.desc()).all()
    res = []
    for e in executions:
        stats = _calculate_execution_stats(e)
        res.append(ExecutionResponse(
            id=e.id,
            project_id=e.project_id,
            project_name=e.project.name if e.project else None,
            name=e.name,
            description=e.description,
            version=e.version,
            environment=e.environment,
            status=e.status,
            total_cases=stats["total"],
            executed_count=stats["executed"],
            passed_count=stats["passed"],
            bugs_count=stats["bugs"],
            improvements_count=stats["improvements"],
            blocked_count=stats["blocked"],
            pending_count=stats["pending"],
            in_progress_count=stats["in_progress"],
            progress_percentage=stats["progress_percentage"],
            responsible_name=e.responsible.full_name if e.responsible else None,
            user_story_ids=[us.id for us in e.user_stories],
            user_story_codes=[us.code for us in e.user_stories],
            started_at=e.started_at,
            ended_at=e.ended_at,
            created_at=e.created_at
        ))
    return res

@router.post("", response_model=ExecutionResponse)
def create_execution(
    data: ExecutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="El proyecto seleccionado no existe.")

    selected_stories = []
    if data.user_story_ids:
        selected_stories = db.query(UserStory).filter(
            UserStory.id.in_(data.user_story_ids),
            UserStory.project_id == data.project_id
        ).all()
        if len(selected_stories) != len(set(data.user_story_ids)):
            raise HTTPException(
                status_code=400,
                detail="Una o más Historias de Usuario no existen o no pertenecen al proyecto seleccionado."
            )

    e = TestExecution(
        project_id=data.project_id,
        name=data.name.strip(),
        description=data.description,
        version=data.version or "v1.0.0",
        environment=data.environment or "QA",
        status="EN_EJECUCION",
        responsible_id=current_user.id,
        started_at=datetime.utcnow()
    )
    if selected_stories:
        e.user_stories = selected_stories
    db.add(e)
    db.flush()

    ordered_cases = []
    if data.test_case_ids and len(data.test_case_ids) > 0:
        found_cases = db.query(TestCase).filter(
            TestCase.id.in_(data.test_case_ids),
            TestCase.is_archived == False
        ).all()
        if len(found_cases) != len(set(data.test_case_ids)):
            raise HTTPException(
                status_code=400,
                detail="Uno o más casos de prueba no existen o están archivados."
            )
        foreign_cases = [c for c in found_cases if c.project_id != data.project_id]
        if foreign_cases:
            raise HTTPException(
                status_code=400,
                detail=f"No se permite asociar casos de otro proyecto. Casos inválidos: {', '.join(c.code for c in foreign_cases)}"
            )
        if data.user_story_ids:
            story_mismatched = [c for c in found_cases if c.user_story_id not in data.user_story_ids]
            if story_mismatched:
                raise HTTPException(
                    status_code=400,
                    detail=f"Los siguientes casos no pertenecen a las Historias de Usuario seleccionadas: {', '.join(c.code for c in story_mismatched)}"
                )

        cases_by_id = {c.id: c for c in found_cases}
        for cid in data.test_case_ids:
            if cid in cases_by_id:
                ordered_cases.append(cases_by_id[cid])

        if not selected_stories:
            story_ids_from_cases = list({c.user_story_id for c in ordered_cases if c.user_story_id})
            if story_ids_from_cases:
                e.user_stories = db.query(UserStory).filter(UserStory.id.in_(story_ids_from_cases)).all()

    elif data.user_story_ids and len(data.user_story_ids) > 0:
        ordered_cases = db.query(TestCase).filter(
            TestCase.user_story_id.in_(data.user_story_ids),
            TestCase.project_id == data.project_id,
            TestCase.is_archived == False
        ).order_by(TestCase.user_story_id.asc(), TestCase.code.asc()).all()
    else:
        ordered_cases = db.query(TestCase).filter(
            TestCase.project_id == data.project_id,
            TestCase.is_archived == False
        ).order_by(TestCase.id.asc()).all()

    for idx, c in enumerate(ordered_cases):
        tr = TestResult(
            execution_id=e.id,
            test_case_id=c.id,
            order_index=idx,
            status=TestStatus.NOT_EXECUTED,
            expected_result=c.expected_result,
            priority=c.priority
        )
        db.add(tr)

    db.commit()
    db.refresh(e)

    stats = _calculate_execution_stats(e)
    return ExecutionResponse(
        id=e.id,
        project_id=e.project_id,
        project_name=e.project.name if e.project else None,
        name=e.name,
        description=e.description,
        version=e.version,
        environment=e.environment,
        status=e.status,
        total_cases=stats["total"],
        executed_count=0,
        passed_count=0,
        bugs_count=0,
        improvements_count=0,
        blocked_count=0,
        pending_count=stats["total"],
        in_progress_count=0,
        progress_percentage=0.0,
        responsible_name=current_user.full_name,
        user_story_ids=[us.id for us in e.user_stories],
        user_story_codes=[us.code for us in e.user_stories],
        started_at=e.started_at,
        ended_at=e.ended_at,
        created_at=e.created_at
    )

def _build_execution_case_item(r: TestResult) -> ExecutionCaseItemResponse:
    tc = r.test_case
    evs = [EvidenceResponse.from_orm(ev) for ev in r.evidences]
    return ExecutionCaseItemResponse(
        id=r.id,
        execution_id=r.execution_id,
        test_case_id=r.test_case_id,
        order_index=r.order_index or 0,
        code=tc.code if tc else "",
        title=tc.title if tc else "",
        module_name=tc.module.name if (tc and tc.module) else None,
        user_story_id=tc.user_story_id if tc else None,
        user_story_code=tc.user_story.code if (tc and tc.user_story) else None,
        user_story_title=tc.user_story.title if (tc and tc.user_story) else None,
        description=tc.description if tc else None,
        preconditions=tc.preconditions if tc else None,
        steps=tc.steps or [] if tc else [],
        expected_result=tc.expected_result if tc else "",
        priority=tc.priority.value if (tc and hasattr(tc.priority, 'value')) else (str(tc.priority) if tc else "P2"),
        status=r.status.value if hasattr(r.status, 'value') else str(r.status),
        actual_result=r.actual_result,
        severity=r.severity.value if hasattr(r.severity, 'value') else str(r.severity),
        observations=r.observations,
        started_at=r.started_at,
        completed_at=r.completed_at,
        executed_at=r.executed_at,
        evidences=evs,
        bug_id=r.bug.id if r.bug else None,
        improvement_id=r.improvement.id if r.improvement else None
    )

@router.get("/{execution_id}", response_model=ExecutionDetailResponse)
def get_execution_detail(execution_id: int, db: Session = Depends(get_db)):
    e = db.query(TestExecution).filter(TestExecution.id == execution_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Execution not found")

    stats = _calculate_execution_stats(e)
    results = sorted(e.results or [], key=lambda r: (r.order_index if r.order_index is not None else 0, r.id))
    case_items = [_build_execution_case_item(r) for r in results if r.test_case]

    stories_data = [
        {"id": us.id, "code": us.code, "title": us.title, "status": us.status}
        for us in e.user_stories
    ]

    return ExecutionDetailResponse(
        id=e.id,
        project_id=e.project_id,
        project_name=e.project.name if e.project else None,
        name=e.name,
        description=e.description,
        version=e.version,
        environment=e.environment,
        status=e.status,
        responsible_name=e.responsible.full_name if e.responsible else None,
        started_at=e.started_at,
        ended_at=e.ended_at,
        created_at=e.created_at,
        total_cases=stats["total"],
        passed_count=stats["passed"],
        bugs_count=stats["bugs"],
        improvements_count=stats["improvements"],
        blocked_count=stats["blocked"],
        pending_count=stats["pending"],
        in_progress_count=stats["in_progress"],
        executed_count=stats["executed"],
        progress_percentage=stats["progress_percentage"],
        user_story_ids=[us.id for us in e.user_stories],
        user_stories=stories_data,
        cases=case_items
    )

@router.get("/{execution_id}/cases", response_model=List[ExecutionCaseItemResponse])
def get_execution_cases(execution_id: int, db: Session = Depends(get_db)):
    e = db.query(TestExecution).filter(TestExecution.id == execution_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Execution not found")

    results = sorted(e.results or [], key=lambda r: (r.order_index if r.order_index is not None else 0, r.id))
    return [_build_execution_case_item(r) for r in results if r.test_case]

@router.get("/{execution_id}/cases/{test_case_id}", response_model=ExecutionCaseItemResponse)
def get_execution_case_detail(
    execution_id: int,
    test_case_id: int,
    db: Session = Depends(get_db)
):
    r = db.query(TestResult).filter(
        TestResult.execution_id == execution_id,
        TestResult.test_case_id == test_case_id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Test case not found in execution")

    if r.status == TestStatus.NOT_EXECUTED:
        r.status = TestStatus.IN_PROGRESS
        if not r.started_at:
            r.started_at = datetime.utcnow()
        db.commit()
        db.refresh(r)

    return _build_execution_case_item(r)

@router.get("/{execution_id}/results", response_model=List[TestResultResponse])
def get_execution_results(execution_id: int, db: Session = Depends(get_db)):
    results = db.query(TestResult).filter(TestResult.execution_id == execution_id).order_by(TestResult.order_index.asc()).all()
    res = []
    for r in results:
        evs = [EvidenceResponse.from_orm(ev) for ev in r.evidences]
        res.append(TestResultResponse(
            id=r.id,
            execution_id=r.execution_id,
            test_case_id=r.test_case_id,
            test_case_code=r.test_case.code if r.test_case else None,
            test_case_title=r.test_case.title if r.test_case else None,
            module_name=r.test_case.module.name if r.test_case and r.test_case.module else None,
            order_index=r.order_index or 0,
            status=r.status,
            expected_result=r.expected_result,
            actual_result=r.actual_result,
            severity=r.severity,
            priority=r.priority,
            observations=r.observations,
            executed_by_name=r.executed_by.full_name if r.executed_by else None,
            started_at=r.started_at,
            completed_at=r.completed_at,
            executed_at=r.executed_at,
            evidences=evs,
            bug_id=r.bug.id if r.bug else None,
            improvement_id=r.improvement.id if r.improvement else None
        ))
    return res

@router.post("/{execution_id}/results", response_model=TestResultResponse)
@router.post("/{execution_id}/result", response_model=TestResultResponse)
async def register_execution_result(
    execution_id: int,
    test_case_id: int = Form(...),
    status: str = Form(...),
    actual_result: Optional[str] = Form(None),
    severity: str = Form(SeverityLevel.NONE.value),
    priority: str = Form(TestPriority.P2.value),
    observations: Optional[str] = Form(None),
    descriptions: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    execution = db.query(TestExecution).filter(TestExecution.id == execution_id).first()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    tc = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")

    try:
        status_enum = TestStatus(status)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Estado de prueba inválido: {status}")

    try:
        severity_enum = SeverityLevel(severity)
    except Exception:
        severity_enum = SeverityLevel.NONE

    try:
        priority_enum = TestPriority(priority)
    except Exception:
        priority_enum = TestPriority.P2

    if status_enum == TestStatus.BUG:
        if not actual_result or not actual_result.strip():
            raise HTTPException(status_code=400, detail="El 'Resultado obtenido' es obligatorio cuando se clasifica como BUG.")
        if severity_enum == SeverityLevel.NONE:
            raise HTTPException(status_code=400, detail="La 'Severidad' es obligatoria para un BUG (no puede ser 'No aplica').")
        if not priority:
            raise HTTPException(status_code=400, detail="La 'Prioridad' es obligatoria para un BUG.")

    elif status_enum == TestStatus.BLOCKED:
        if not actual_result or not actual_result.strip():
            raise HTTPException(status_code=400, detail="El 'Resultado obtenido' es obligatorio cuando se clasifica como BLOQUEADO.")
        if not observations or not observations.strip():
            raise HTTPException(status_code=400, detail="Las 'Observaciones' son obligatorias explicando el motivo del bloqueo.")

    tr = db.query(TestResult).filter(
        TestResult.execution_id == execution_id,
        TestResult.test_case_id == test_case_id
    ).first()

    if not tr:
        tr = TestResult(
            execution_id=execution_id,
            test_case_id=test_case_id,
            expected_result=tc.expected_result,
        )
        db.add(tr)

    tr.status = status_enum
    tr.actual_result = actual_result.strip() if actual_result else None
    tr.severity = severity_enum
    tr.priority = priority_enum
    tr.observations = observations.strip() if observations else None
    tr.executed_by_id = current_user.id
    tr.completed_at = datetime.utcnow()
    tr.executed_at = datetime.utcnow()
    if not tr.started_at:
        tr.started_at = datetime.utcnow()
    db.commit()
    db.refresh(tr)

    desc_list = []
    if descriptions:
        try:
            desc_list = json.loads(descriptions)
        except Exception:
            pass

    if files:
        for idx, file in enumerate(files):
            if file.filename:
                unique_name, dest_path, file_size = await StorageService.save_evidence_file(file)
                desc = desc_list[idx] if idx < len(desc_list) else ""
                ev = Evidence(
                    test_result_id=tr.id,
                    file_name=file.filename,
                    content_type=file.content_type or "image/png",
                    file_size=file_size,
                    file_path=dest_path,
                    description=desc,
                    display_order=len(tr.evidences) + idx
                )
                db.add(ev)
        db.commit()
        db.refresh(tr)

    if status_enum == TestStatus.BUG:
        existing_bug = db.query(Bug).filter(Bug.test_result_id == tr.id).first()
        if not existing_bug:
            bug_count = db.query(Bug).count() + 1
            bug_code = f"BUG-{bug_count:03d}"
            while db.query(Bug).filter(Bug.code == bug_code).first():
                bug_count += 1
                bug_code = f"BUG-{bug_count:03d}"

            new_bug = Bug(
                code=bug_code,
                title=f"Fallo en {tc.code}: {tc.title}",
                description=actual_result or "Fallo detectado durante la ejecución",
                project_id=execution.project_id,
                module_id=tc.module_id,
                test_case_id=tc.id,
                test_result_id=tr.id,
                execution_id=execution.id,
                steps_to_reproduce="\n".join([f"{i+1}. {s}" for i, s in enumerate(tc.steps or [])]),
                severity=severity_enum if severity_enum != SeverityLevel.NONE else SeverityLevel.MEDIUM,
                priority=priority_enum,
                status=BugStatus.OPEN,
                created_by_id=current_user.id
            )
            db.add(new_bug)
            db.commit()
            db.refresh(new_bug)
            for ev in tr.evidences:
                ev.bug_id = new_bug.id
            db.commit()
        else:
            existing_bug.severity = severity_enum
            existing_bug.priority = priority_enum
            existing_bug.description = actual_result
            for ev in tr.evidences:
                ev.bug_id = existing_bug.id
            db.commit()

    elif status_enum == TestStatus.IMPROVEMENT:
        existing_mej = db.query(Improvement).filter(Improvement.test_result_id == tr.id).first()
        if not existing_mej:
            mej_count = db.query(Improvement).count() + 1
            mej_code = f"MEJ-{mej_count:03d}"
            while db.query(Improvement).filter(Improvement.code == mej_code).first():
                mej_count += 1
                mej_code = f"MEJ-{mej_count:03d}"

            new_mej = Improvement(
                code=mej_code,
                title=f"Oportunidad de mejora en {tc.code}: {tc.title}",
                description=actual_result or observations or "Mejora propuesta durante la prueba",
                project_id=execution.project_id,
                module_id=tc.module_id,
                test_case_id=tc.id,
                test_result_id=tr.id,
                priority=priority_enum,
                created_by_id=current_user.id
            )
            db.add(new_mej)
            db.commit()
            db.refresh(new_mej)
            for ev in tr.evidences:
                ev.improvement_id = new_mej.id
            db.commit()

    db.refresh(tr)
    return TestResultResponse(
        id=tr.id,
        execution_id=tr.execution_id,
        test_case_id=tr.test_case_id,
        test_case_code=tc.code,
        test_case_title=tc.title,
        module_name=tc.module.name if tc.module else None,
        order_index=tr.order_index or 0,
        status=tr.status,
        expected_result=tr.expected_result,
        actual_result=tr.actual_result,
        severity=tr.severity,
        priority=tr.priority,
        observations=tr.observations,
        executed_by_name=current_user.full_name,
        started_at=tr.started_at,
        completed_at=tr.completed_at,
        executed_at=tr.executed_at,
        evidences=[EvidenceResponse.from_orm(e) for e in sorted(tr.evidences or [], key=lambda x: (x.display_order or 0, x.id or 0))],
        bug_id=tr.bug.id if tr.bug else None,
        improvement_id=tr.improvement.id if tr.improvement else None
    )

@router.post("/{execution_id}/draft", response_model=TestResultResponse)
async def save_execution_draft(
    execution_id: int,
    test_case_id: int = Form(...),
    actual_result: Optional[str] = Form(None),
    severity: str = Form(SeverityLevel.NONE.value),
    priority: str = Form(TestPriority.P2.value),
    observations: Optional[str] = Form(None),
    descriptions: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    execution = db.query(TestExecution).filter(TestExecution.id == execution_id).first()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    tc = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")

    try:
        severity_enum = SeverityLevel(severity)
    except Exception:
        severity_enum = SeverityLevel.NONE

    try:
        priority_enum = TestPriority(priority)
    except Exception:
        priority_enum = TestPriority.P2

    tr = db.query(TestResult).filter(
        TestResult.execution_id == execution_id,
        TestResult.test_case_id == test_case_id
    ).first()

    if not tr:
        tr = TestResult(
            execution_id=execution_id,
            test_case_id=test_case_id,
            expected_result=tc.expected_result,
        )
        db.add(tr)

    tr.status = TestStatus.IN_PROGRESS
    tr.actual_result = actual_result.strip() if actual_result else None
    tr.severity = severity_enum
    tr.priority = priority_enum
    tr.observations = observations.strip() if observations else None
    tr.executed_by_id = current_user.id
    if not tr.started_at:
        tr.started_at = datetime.utcnow()
    db.commit()
    db.refresh(tr)

    desc_list = []
    if descriptions:
        try:
            desc_list = json.loads(descriptions)
        except Exception:
            pass

    if files:
        for idx, file in enumerate(files):
            if file.filename:
                unique_name, dest_path, file_size = await StorageService.save_evidence_file(file)
                desc = desc_list[idx] if idx < len(desc_list) else ""
                ev = Evidence(
                    test_result_id=tr.id,
                    file_name=file.filename,
                    content_type=file.content_type or "image/png",
                    file_size=file_size,
                    file_path=dest_path,
                    description=desc,
                    display_order=len(tr.evidences) + idx
                )
                db.add(ev)
        db.commit()
        db.refresh(tr)

    return TestResultResponse(
        id=tr.id,
        execution_id=tr.execution_id,
        test_case_id=tr.test_case_id,
        test_case_code=tc.code,
        test_case_title=tc.title,
        module_name=tc.module.name if tc.module else None,
        order_index=tr.order_index or 0,
        status=tr.status,
        expected_result=tr.expected_result,
        actual_result=tr.actual_result,
        severity=tr.severity,
        priority=tr.priority,
        observations=tr.observations,
        executed_by_name=current_user.full_name,
        started_at=tr.started_at,
        completed_at=tr.completed_at,
        executed_at=tr.executed_at,
        evidences=[EvidenceResponse.from_orm(e) for e in tr.evidences],
        bug_id=tr.bug.id if tr.bug else None,
        improvement_id=tr.improvement.id if tr.improvement else None
    )

@router.post("/{execution_id}/finish")
def finish_execution(
    execution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    e = db.query(TestExecution).filter(TestExecution.id == execution_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Execution not found")

    stats = _calculate_execution_stats(e)
    pending_total = stats["pending"] + stats["in_progress"]

    e.status = "FINALIZADA"
    e.ended_at = datetime.utcnow()
    db.commit()

    return {
        "message": "Ejecución finalizada con éxito",
        "warning": pending_total > 0,
        "pending_count": pending_total,
        "execution_id": e.id,
        "status": e.status,
        "ended_at": e.ended_at
    }

@router.delete("/{execution_id}")
def delete_execution(
    execution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    e = db.query(TestExecution).filter(TestExecution.id == execution_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Execution not found")

    # Find all bug IDs associated with this execution (either via execution_id or test_results)
    linked_bugs = db.query(Bug).filter(
        (Bug.execution_id == execution_id) |
        (Bug.test_result_id.in_([r.id for r in e.results or []]))
    ).all()

    for b in linked_bugs:
        for bev in b.evidences or []:
            if bev.file_path and os.path.exists(bev.file_path):
                try:
                    os.remove(bev.file_path)
                except Exception:
                    pass
            db.delete(bev)
        db.delete(b)

    # Clean up improvements
    linked_mejs = db.query(Improvement).filter(
        Improvement.test_result_id.in_([r.id for r in e.results or []])
    ).all()
    for m in linked_mejs:
        db.delete(m)

    # Remove evidence files and records
    for r in e.results or []:
        for ev in r.evidences or []:
            if ev.file_path and os.path.exists(ev.file_path):
                try:
                    os.remove(ev.file_path)
                except Exception:
                    pass
            db.delete(ev)

    db.delete(e)
    db.commit()
    return {"message": "Ejecución eliminada exitosamente"}

@router.delete("/{execution_id}/evidence/{evidence_id}")
def delete_execution_evidence(
    execution_id: int,
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ev = db.query(Evidence).join(TestResult).filter(
        Evidence.id == evidence_id,
        TestResult.execution_id == execution_id
    ).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found in execution")

    if ev.file_path and os.path.exists(ev.file_path):
        try:
            os.remove(ev.file_path)
        except Exception:
            pass

    db.delete(ev)
    db.commit()
    return {"message": "Evidencia eliminada exitosamente"}
