from typing import List, Optional, Dict, Any
from datetime import datetime
import re
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.core.database import get_db
from app.models.entities import (
    UserStory, TestCase, TestExecution, TestResult, Project, Module, User, UserRole, TestPriority, execution_user_stories
)
from app.schemas.schemas import (
    UserStoryCreate, UserStoryUpdate, UserStoryResponse, UserStoryDetailResponse,
    TestCaseResponse, PaginatedTestCasesResponse, BatchAssignUserStoryRequest,
    ImportPreviewResponse, ImportPreviewItem, ImportCommitRequest, ImportCommitResponse
)
from app.services.excel_service import ExcelService
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/user-stories", tags=["Historias de Usuario"])

def get_next_user_story_code(db: Session, project_id: int) -> str:
    stories = db.query(UserStory.code).filter(UserStory.project_id == project_id).all()
    max_num = 0
    for (c,) in stories:
        if c and c.startswith("HU-"):
            m = re.search(r"HU-(\d+)", c)
            if m:
                max_num = max(max_num, int(m.group(1)))
    return f"HU-{max_num + 1:03d}"

def serialize_user_story(story: UserStory, db: Session) -> UserStoryResponse:
    project_name = story.project.name if story.project else None
    module_name = story.module.name if story.module else None
    assignee_name = story.assignee.full_name if story.assignee else None
    cases_count = db.query(TestCase).filter(
        TestCase.user_story_id == story.id,
        TestCase.is_archived == False
    ).count()

    latest_exec = (
        db.query(TestExecution)
        .join(execution_user_stories, TestExecution.id == execution_user_stories.c.execution_id)
        .filter(execution_user_stories.c.user_story_id == story.id)
        .order_by(desc(TestExecution.id))
        .first()
    )
    if not latest_exec:
        latest_exec = (
            db.query(TestExecution)
            .join(TestResult, TestResult.execution_id == TestExecution.id)
            .join(TestCase, TestResult.test_case_id == TestCase.id)
            .filter(TestCase.user_story_id == story.id)
            .order_by(desc(TestExecution.id))
            .first()
        )
    latest_status = latest_exec.status if latest_exec else None

    return UserStoryResponse(
        id=story.id,
        project_id=story.project_id,
        project_name=project_name,
        module_id=story.module_id,
        module_name=module_name,
        code=story.code,
        title=story.title,
        description=story.description or story.story_text,
        story_text=story.story_text or story.description or "",
        status=story.status or "TODO",
        assignee_id=story.assignee_id,
        assignee_name=assignee_name,
        jira_key=story.jira_key,
        acceptance_criteria=story.acceptance_criteria or [],
        business_rules=story.business_rules,
        test_cases_count=cases_count,
        latest_execution_status=latest_status,
        created_at=story.created_at,
        updated_at=story.updated_at
    )

@router.get("", response_model=List[UserStoryResponse])
def list_user_stories(
    project_id: Optional[int] = Query(None),
    module_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(UserStory)
    if project_id:
        query = query.filter(UserStory.project_id == project_id)
    if module_id:
        query = query.filter(UserStory.module_id == module_id)
    if status_filter:
        query = query.filter(UserStory.status == status_filter)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                UserStory.code.ilike(term),
                UserStory.title.ilike(term),
                UserStory.description.ilike(term),
                UserStory.story_text.ilike(term),
                UserStory.jira_key.ilike(term)
            )
        )

    stories = query.order_by(UserStory.id.desc()).all()
    return [serialize_user_story(s, db) for s in stories]

@router.post("", response_model=UserStoryResponse, status_code=status.HTTP_201_CREATED)
def create_user_story(
    data: UserStoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los usuarios con rol VIEWER no tienen permisos para crear historias de usuario."
        )

    project = db.query(Project).filter(Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="El proyecto seleccionado no existe.")

    # Validate code or generate
    code = (data.code or "").strip().upper()
    if code:
        existing = db.query(UserStory).filter(
            UserStory.project_id == data.project_id,
            UserStory.code == code
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"El código '{code}' ya está en uso en este proyecto. Use otro código único."
            )
    else:
        code = get_next_user_story_code(db, data.project_id)

    description = data.description or data.story_text or ""
    story = UserStory(
        project_id=data.project_id,
        module_id=data.module_id,
        code=code,
        title=data.title,
        description=description,
        story_text=description,
        status=data.status or "TODO",
        assignee_id=data.assignee_id,
        jira_key=data.jira_key,
        acceptance_criteria=data.acceptance_criteria or [],
        business_rules=data.business_rules,
        created_by_id=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    return serialize_user_story(story, db)

@router.get("/{story_id}", response_model=UserStoryDetailResponse)
def get_user_story_detail(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    story = db.query(UserStory).filter(UserStory.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Historia de Usuario no encontrada.")

    base_resp = serialize_user_story(story, db)

    # Associated test cases
    test_cases_query = db.query(TestCase).filter(
        TestCase.user_story_id == story.id,
        TestCase.is_archived == False
    ).order_by(TestCase.code.asc()).all()

    test_case_responses = []
    latest_status_counts = {"PASSED": 0, "BUG": 0, "IMPROVEMENT": 0, "BLOCKED": 0, "NOT_EXECUTED": 0, "IN_PROGRESS": 0}

    for tc in test_cases_query:
        latest_res = db.query(TestResult).filter(
            TestResult.test_case_id == tc.id
        ).order_by(desc(TestResult.id)).first()
        
        last_status_str = latest_res.status.value if latest_res else None
        if last_status_str in latest_status_counts:
            latest_status_counts[last_status_str] += 1
        elif last_status_str is None:
            latest_status_counts["NOT_EXECUTED"] += 1

        test_case_responses.append(
            TestCaseResponse(
                id=tc.id,
                project_id=tc.project_id,
                module_id=tc.module_id,
                module_name=tc.module.name if tc.module else None,
                code=tc.code,
                title=tc.title,
                description=tc.description,
                preconditions=tc.preconditions,
                steps=tc.steps or [],
                expected_result=tc.expected_result,
                priority=tc.priority,
                tags=tc.tags or [],
                is_ai_generated=tc.is_ai_generated,
                is_archived=tc.is_archived,
                user_story_id=tc.user_story_id,
                user_story_code=story.code,
                user_story_title=story.title,
                last_result=last_status_str,
                created_at=tc.created_at
            )
        )

    # Associated executions (either via execution_user_stories or containing results for this story's cases)
    exec_ids_from_m2m = [e.id for e in story.executions]
    exec_ids_from_results = [
        r[0] for r in db.query(TestResult.execution_id)
        .join(TestCase, TestResult.test_case_id == TestCase.id)
        .filter(TestCase.user_story_id == story.id)
        .distinct().all()
    ]
    all_exec_ids = list(set(exec_ids_from_m2m + exec_ids_from_results))

    executions_summary = []
    if all_exec_ids:
        execs = db.query(TestExecution).filter(TestExecution.id.in_(all_exec_ids)).order_by(desc(TestExecution.id)).all()
        for ex in execs:
            total_cases = len(ex.results)
            passed = sum(1 for r in ex.results if r.status.value == "PASSED")
            failed = sum(1 for r in ex.results if r.status.value == "BUG")
            executions_summary.append({
                "id": ex.id,
                "name": ex.name,
                "version": ex.version,
                "environment": ex.environment,
                "status": ex.status,
                "started_at": ex.started_at.isoformat() if ex.started_at else None,
                "ended_at": ex.ended_at.isoformat() if ex.ended_at else None,
                "total_cases": total_cases,
                "passed_count": passed,
                "bugs_count": failed
            })

    total_c = len(test_cases_query)
    passed_c = latest_status_counts["PASSED"]
    failed_c = latest_status_counts["BUG"]
    blocked_c = latest_status_counts["BLOCKED"]
    pending_c = total_c - (passed_c + failed_c + blocked_c + latest_status_counts["IMPROVEMENT"])
    pass_rate = round((passed_c / total_c * 100), 1) if total_c > 0 else 0.0

    metrics = {
        "total_cases": total_c,
        "passed": passed_c,
        "failed": failed_c,
        "blocked": blocked_c,
        "pending": max(0, pending_c),
        "pass_rate": pass_rate,
        "coverage_percentage": 100.0 if total_c > 0 else 0.0
    }

    return UserStoryDetailResponse(
        **base_resp.model_dump(),
        test_cases=test_case_responses,
        executions=executions_summary,
        metrics=metrics
    )

@router.put("/{story_id}", response_model=UserStoryResponse)
def update_user_story(
    story_id: int,
    data: UserStoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los usuarios con rol VIEWER no tienen permisos para modificar historias de usuario."
        )

    story = db.query(UserStory).filter(UserStory.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Historia de Usuario no encontrada.")

    # Project association validation
    if data.project_id is not None and data.project_id != story.project_id:
        target_project = db.query(Project).filter(Project.id == data.project_id).first()
        if not target_project:
            raise HTTPException(status_code=404, detail="El proyecto de destino especificado no existe.")
        has_cases = db.query(TestCase).filter(TestCase.user_story_id == story.id).count()
        if has_cases > 0:
            raise HTTPException(
                status_code=400,
                detail="No se permite cambiar el proyecto de una historia que ya tiene casos de prueba asociados."
            )
        story.project_id = data.project_id

    if data.code is not None:
        new_code = data.code.strip().upper()
        if not new_code:
            raise HTTPException(status_code=400, detail="El código de la historia no puede estar vacío.")
        if new_code != story.code:
            existing = db.query(UserStory).filter(
                UserStory.project_id == story.project_id,
                UserStory.code == new_code,
                UserStory.id != story.id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail=f"El código '{new_code}' ya está en uso en este proyecto."
                )
            story.code = new_code

    if data.title is not None:
        title_clean = data.title.strip()
        if not title_clean:
            raise HTTPException(status_code=400, detail="El título de la historia no puede estar vacío.")
        story.title = title_clean
    if data.description is not None:
        story.description = data.description
        story.story_text = data.description
    elif data.story_text is not None:
        story.story_text = data.story_text
        story.description = data.story_text
    if data.module_id is not None:
        story.module_id = data.module_id
    if data.status is not None:
        story.status = data.status
    if data.assignee_id is not None:
        story.assignee_id = data.assignee_id
    if data.jira_key is not None:
        story.jira_key = data.jira_key
    if data.acceptance_criteria is not None:
        story.acceptance_criteria = data.acceptance_criteria
    if data.business_rules is not None:
        story.business_rules = data.business_rules

    story.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(story)
    return serialize_user_story(story, db)

@router.delete("/{story_id}")
def delete_user_story(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los usuarios con rol VIEWER no tienen permisos para eliminar historias de usuario."
        )

    story = db.query(UserStory).filter(UserStory.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Historia de Usuario no encontrada.")

    # 1. Check if the user story is directly linked to test executions
    exec_count = db.query(execution_user_stories).filter(
        execution_user_stories.c.user_story_id == story.id
    ).count()

    # 2. Check if associated test cases have historical execution results
    results_count = (
        db.query(TestResult)
        .join(TestCase, TestResult.test_case_id == TestCase.id)
        .filter(TestCase.user_story_id == story.id)
        .count()
    )

    if exec_count > 0 or results_count > 0:
        raise HTTPException(
            status_code=400,
            detail=(
                f"No es posible eliminar la Historia de Usuario '{story.code}' porque cuenta con "
                f"historial de ejecución activo ({exec_count} ejecuciones vinculadas, {results_count} resultados registrados). "
                "Para proteger la integridad y trazabilidad de QA, las historias con ejecuciones históricas no pueden ser eliminadas."
            )
        )

    # Safely detach associated test cases so they remain in the project without data loss
    detached_cases = db.query(TestCase).filter(TestCase.user_story_id == story.id).update(
        {TestCase.user_story_id: None},
        synchronize_session=False
    )

    db.delete(story)
    db.commit()

    msg = f"Historia de Usuario {story.code} eliminada exitosamente."
    if detached_cases > 0:
        msg += f" {detached_cases} casos de prueba asociados fueron desacoplados de manera segura y conservados en el proyecto."

    return {
        "message": msg,
        "detached_cases_count": detached_cases,
        "id": story_id
    }

@router.post("/{story_id}/assign-cases")
def assign_cases_to_story(
    story_id: int,
    payload: Dict[str, List[int]],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    story = db.query(UserStory).filter(UserStory.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Historia de Usuario no encontrada.")

    case_ids = payload.get("test_case_ids", [])
    if not case_ids:
        return {"message": "No se enviaron casos para asignar", "count": 0}

    # Reject cases that belong to a different project
    mismatched = db.query(TestCase).filter(
        TestCase.id.in_(case_ids),
        TestCase.project_id != story.project_id
    ).all()
    if mismatched:
        bad_codes = ", ".join([c.code for c in mismatched])
        raise HTTPException(
            status_code=400,
            detail=f"No se permite asociación cruzada entre proyectos. Casos de otro proyecto: {bad_codes}"
        )

    updated_count = db.query(TestCase).filter(
        TestCase.id.in_(case_ids),
        TestCase.project_id == story.project_id
    ).update(
        {TestCase.user_story_id: story.id},
        synchronize_session=False
    )
    db.commit()
    return {"message": "Casos asignados exitosamente a la Historia de Usuario", "count": updated_count}

@router.post("/batch-assign")
def batch_assign_cases(
    payload: BatchAssignUserStoryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not payload.test_case_ids:
        return {"message": "No se enviaron casos para actualizar", "count": 0}

    target_story = None
    if payload.user_story_id:
        target_story = db.query(UserStory).filter(UserStory.id == payload.user_story_id).first()
        if not target_story:
            raise HTTPException(status_code=404, detail="Historia de Usuario de destino no encontrada.")

        mismatched = db.query(TestCase).filter(
            TestCase.id.in_(payload.test_case_ids),
            TestCase.project_id != target_story.project_id
        ).all()
        if mismatched:
            bad_codes = ", ".join([c.code for c in mismatched])
            raise HTTPException(
                status_code=400,
                detail=f"No se permite asociación cruzada entre proyectos. Casos de otro proyecto: {bad_codes}"
            )

    query = db.query(TestCase).filter(TestCase.id.in_(payload.test_case_ids))
    updated_count = query.update(
        {TestCase.user_story_id: payload.user_story_id},
        synchronize_session=False
    )
    db.commit()
    return {"message": "Asignación masiva completada exitosamente", "count": updated_count}

@router.get("/{story_id}/import-cases/template")
def download_story_import_template(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    story = db.query(UserStory).filter(UserStory.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Historia de Usuario no encontrada.")

    file_stream = ExcelService.generate_template(for_story=True)
    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=plantilla_casos_{story.code}.xlsx"}
    )

@router.post("/{story_id}/import-cases/preview", response_model=ImportPreviewResponse)
async def preview_cases_for_story(
    story_id: int,
    project_id: Optional[int] = Query(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    story = db.query(UserStory).filter(UserStory.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Historia de Usuario no encontrada.")

    if project_id is not None and story.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se permite asociación cruzada: la Historia de Usuario no pertenece al proyecto seleccionado."
        )

    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato no válido. Debe ser un archivo .xlsx o .xls"
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo supera el tamaño máximo permitido de 10 MB."
        )

    existing_tcs = db.query(TestCase.code).filter(TestCase.project_id == story.project_id).all()
    existing_codes = {t[0].upper() for t in existing_tcs}

    try:
        preview_items = ExcelService.parse_and_validate_excel(content, existing_codes, auto_generate_code=True)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )

    valid_count = sum(1 for it in preview_items if it["status"] == "VALID")
    warning_count = sum(1 for it in preview_items if it["status"] == "WARNING")
    error_count = sum(1 for it in preview_items if it["status"] == "ERROR")

    return ImportPreviewResponse(
        filename=file.filename,
        total_rows=len(preview_items),
        valid_count=valid_count,
        warning_count=warning_count,
        error_count=error_count,
        items=[ImportPreviewItem(**it) for it in preview_items]
    )

@router.post("/{story_id}/import-cases/commit", response_model=ImportCommitResponse)
def commit_cases_for_story(
    story_id: int,
    payload: ImportCommitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    story = db.query(UserStory).filter(UserStory.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Historia de Usuario no encontrada.")

    if payload.project_id != story.project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se permite asociación cruzada: el proyecto indicado no coincide con la Historia de Usuario."
        )

    modules = db.query(Module).filter(Module.project_id == story.project_id).all()
    module_map = {m.name.strip().lower(): m.id for m in modules}

    created = 0
    updated = 0
    skipped = 0
    errors = []

    existing_cases = {
        tc.code.upper(): tc
        for tc in db.query(TestCase).filter(TestCase.project_id == story.project_id).all()
    }

    try:
        for item in payload.items:
            code_upper = item.code.strip().upper()

            mod_id = None
            if item.module_name:
                mod_name_clean = item.module_name.strip()
                mod_key = mod_name_clean.lower()
                if mod_key in module_map:
                    mod_id = module_map[mod_key]
                else:
                    new_mod = Module(project_id=story.project_id, name=mod_name_clean)
                    db.add(new_mod)
                    db.flush()
                    mod_id = new_mod.id
                    module_map[mod_key] = mod_id
            elif story.module_id:
                mod_id = story.module_id

            try:
                prio_enum = TestPriority(item.priority.upper())
            except Exception:
                prio_enum = TestPriority.P2

            if code_upper in existing_cases:
                if payload.strategy == "SKIP":
                    skipped += 1
                    continue
                elif payload.strategy == "UPDATE":
                    tc = existing_cases[code_upper]
                    tc.title = item.title
                    if item.description is not None:
                        tc.description = item.description
                    tc.expected_result = item.expected_result
                    tc.priority = prio_enum
                    if mod_id:
                        tc.module_id = mod_id
                    if item.preconditions:
                        tc.preconditions = item.preconditions
                    if item.steps:
                        tc.steps = item.steps
                    tc.user_story_id = story.id
                    tc.is_archived = False
                    updated += 1
                elif payload.strategy == "CANCEL":
                    db.rollback()
                    raise HTTPException(
                        status_code=400,
                        detail=f"Importación cancelada: código duplicado {item.code} encontrado."
                    )
            else:
                new_tc = TestCase(
                    project_id=story.project_id,
                    module_id=mod_id,
                    code=code_upper,
                    title=item.title,
                    description=item.description,
                    preconditions=item.preconditions,
                    steps=item.steps,
                    expected_result=item.expected_result,
                    priority=prio_enum,
                    is_ai_generated=False,
                    is_archived=False,
                    user_story_id=story.id,
                    created_by_id=current_user.id
                )
                db.add(new_tc)
                created += 1

        db.commit()
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error al persistir casos de prueba para la historia: {str(exc)}"
        )

    total_associated = db.query(TestCase).filter(
        TestCase.user_story_id == story.id,
        TestCase.is_archived == False
    ).count()

    return ImportCommitResponse(
        processed=len(payload.items),
        created=created,
        updated=updated,
        skipped=skipped,
        errors=errors,
        total_associated_cases=total_associated
    )

@router.get("/{story_id}/test-cases", response_model=PaginatedTestCasesResponse)
def get_user_story_test_cases(
    story_id: int,
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    story = db.query(UserStory).filter(UserStory.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Historia de Usuario no encontrada.")

    query = db.query(TestCase).filter(
        TestCase.user_story_id == story.id,
        TestCase.is_archived == False
    )

    if priority:
        query = query.filter(TestCase.priority == priority)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(or_(
            TestCase.code.ilike(search_filter),
            TestCase.title.ilike(search_filter),
            TestCase.description.ilike(search_filter),
            TestCase.expected_result.ilike(search_filter)
        ))

    total = query.count()
    cases = query.order_by(TestCase.code.asc()).offset((page - 1) * page_size).limit(page_size).all()

    res = []
    for c in cases:
        last_res = db.query(TestResult).filter(TestResult.test_case_id == c.id).order_by(desc(TestResult.id)).first()
        res.append(TestCaseResponse(
            id=c.id,
            project_id=c.project_id,
            module_id=c.module_id,
            module_name=c.module.name if c.module else None,
            code=c.code,
            title=c.title,
            description=c.description,
            preconditions=c.preconditions,
            steps=c.steps or [],
            expected_result=c.expected_result,
            priority=c.priority,
            tags=c.tags or [],
            is_ai_generated=c.is_ai_generated,
            is_archived=c.is_archived,
            user_story_id=c.user_story_id,
            user_story_code=story.code,
            user_story_title=story.title,
            last_result=last_res.status.value if last_res else None,
            created_at=c.created_at
        ))

    pages = (total + page_size - 1) // page_size if page_size > 0 else 1
    return PaginatedTestCasesResponse(
        items=res,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )
