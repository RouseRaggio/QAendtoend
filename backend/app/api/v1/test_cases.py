from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.models.entities import TestCase, Project, Module, User, TestResult, TestPriority, UserStory
from app.schemas.schemas import (
    TestCaseCreate, TestCaseUpdate, TestCaseResponse,
    PaginatedTestCasesResponse, ImportPreviewResponse, ImportPreviewItem,
    ImportCommitRequest, ImportCommitResponse, BatchAssignUserStoryRequest
)
from app.api.v1.auth import get_current_user
from app.services.excel_service import ExcelService

router = APIRouter(prefix="/test-cases", tags=["Test Cases"])

def serialize_test_case(tc: TestCase, last_res_str: Optional[str] = None) -> TestCaseResponse:
    return TestCaseResponse(
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
        user_story_code=tc.user_story.code if tc.user_story else None,
        user_story_title=tc.user_story.title if tc.user_story else None,
        last_result=last_res_str,
        created_at=tc.created_at
    )

@router.get("/template")
def download_template(current_user: User = Depends(get_current_user)):
    file_stream = ExcelService.generate_template()
    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=plantilla_casos_prueba.xlsx"}
    )

@router.post("/import/preview", response_model=ImportPreviewResponse)
async def import_preview(
    project_id: int = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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

    existing_tcs = db.query(TestCase.code).filter(TestCase.project_id == project_id).all()
    existing_codes = {t[0].upper() for t in existing_tcs}

    try:
        preview_items = ExcelService.parse_and_validate_excel(content, existing_codes)
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

@router.post("/import/commit", response_model=ImportCommitResponse)
def import_commit(
    payload: ImportCommitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    if payload.user_story_id:
        story = db.query(UserStory).filter(UserStory.id == payload.user_story_id).first()
        if not story:
            raise HTTPException(status_code=404, detail="Historia de Usuario no encontrada")
        if story.project_id != payload.project_id:
            raise HTTPException(
                status_code=400,
                detail="No se permite asociación cruzada: la Historia de Usuario no pertenece al proyecto seleccionado."
            )

    modules = db.query(Module).filter(Module.project_id == payload.project_id).all()
    module_map = {m.name.strip().lower(): m.id for m in modules}

    created = 0
    updated = 0
    skipped = 0
    errors = []

    existing_cases = {
        tc.code.upper(): tc
        for tc in db.query(TestCase).filter(TestCase.project_id == payload.project_id).all()
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
                    new_mod = Module(project_id=payload.project_id, name=mod_name_clean)
                    db.add(new_mod)
                    db.flush()
                    mod_id = new_mod.id
                    module_map[mod_key] = mod_id

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
                    if item.description is not None: tc.description = item.description
                    tc.expected_result = item.expected_result
                    tc.priority = prio_enum
                    if mod_id: tc.module_id = mod_id
                    if item.preconditions: tc.preconditions = item.preconditions
                    if item.steps: tc.steps = item.steps
                    if payload.user_story_id: tc.user_story_id = payload.user_story_id
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
                    project_id=payload.project_id,
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
                    user_story_id=payload.user_story_id,
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
            detail=f"Error al persistir casos de prueba: {str(exc)}"
        )

    total_associated = None
    if payload.user_story_id:
        total_associated = db.query(TestCase).filter(
            TestCase.user_story_id == payload.user_story_id,
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

@router.post("/import/error-report")
def download_error_report(
    errors: List[dict],
    current_user: User = Depends(get_current_user)
):
    file_stream = ExcelService.generate_error_report(errors)
    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=reporte_errores_importacion.xlsx"}
    )


@router.get("", response_model=PaginatedTestCasesResponse)
def get_test_cases(
    project_id: Optional[int] = Query(None),
    module_id: Optional[int] = Query(None),
    user_story_id: Optional[int] = Query(None),
    unassigned_story: Optional[bool] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(TestCase).filter(TestCase.is_archived == False)
    if project_id:
        query = query.filter(TestCase.project_id == project_id)
    if module_id:
        query = query.filter(TestCase.module_id == module_id)
    if user_story_id:
        query = query.filter(TestCase.user_story_id == user_story_id)
    if unassigned_story:
        query = query.filter(TestCase.user_story_id == None)
    if priority:
        query = query.filter(TestCase.priority == priority)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(or_(
            TestCase.code.ilike(search_filter),
            TestCase.title.ilike(search_filter),
            TestCase.expected_result.ilike(search_filter)
        ))

    total = query.count()
    cases = query.order_by(TestCase.id.asc()).offset((page - 1) * page_size).limit(page_size).all()

    res = []
    for c in cases:
        last_res = db.query(TestResult).filter(TestResult.test_case_id == c.id).order_by(TestResult.executed_at.desc()).first()
        res.append(serialize_test_case(c, last_res.status.value if last_res else None))

    pages = (total + page_size - 1) // page_size if page_size > 0 else 1
    return PaginatedTestCasesResponse(
        items=res,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )

@router.get("/{test_case_id}", response_model=TestCaseResponse)
def get_test_case_by_id(
    test_case_id: int,
    db: Session = Depends(get_db)
):
    tc = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Caso de prueba no encontrado")
    last_res = db.query(TestResult).filter(TestResult.test_case_id == tc.id).order_by(TestResult.executed_at.desc()).first()
    return serialize_test_case(tc, last_res.status.value if last_res else None)

@router.post("", response_model=TestCaseResponse)
def create_test_case(
    data: TestCaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    code_clean = data.code.strip().upper()
    existing = db.query(TestCase).filter(
        TestCase.project_id == data.project_id,
        TestCase.code == code_clean,
        TestCase.is_archived == False
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"El código {code_clean} ya existe en este proyecto."
        )

    tc = TestCase(
        project_id=data.project_id,
        module_id=data.module_id,
        code=code_clean,
        title=data.title,
        description=data.description,
        preconditions=data.preconditions,
        steps=data.steps,
        expected_result=data.expected_result,
        priority=data.priority,
        tags=data.tags,
        is_ai_generated=data.is_ai_generated,
        is_archived=False,
        user_story_id=data.user_story_id,
        created_by_id=current_user.id
    )
    db.add(tc)
    db.commit()
    db.refresh(tc)
    return serialize_test_case(tc, None)

@router.put("/{test_case_id}", response_model=TestCaseResponse)
def update_test_case(
    test_case_id: int,
    data: TestCaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tc = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Caso de prueba no encontrado")
    if data.title is not None: tc.title = data.title
    if data.description is not None: tc.description = data.description
    if data.preconditions is not None: tc.preconditions = data.preconditions
    if data.steps is not None: tc.steps = data.steps
    if data.expected_result is not None: tc.expected_result = data.expected_result
    if data.priority is not None: tc.priority = data.priority
    if data.module_id is not None: tc.module_id = data.module_id
    if data.tags is not None: tc.tags = data.tags
    if data.user_story_id is not None:
        if data.user_story_id > 0:
            story = db.query(UserStory).filter(UserStory.id == data.user_story_id).first()
            if not story:
                raise HTTPException(status_code=404, detail="Historia de Usuario no encontrada")
            if story.project_id != tc.project_id:
                raise HTTPException(status_code=400, detail="No se permite asignar una Historia de Usuario de otro proyecto.")
            tc.user_story_id = story.id
        else:
            tc.user_story_id = None
    db.commit()
    db.refresh(tc)
    
    last_res = db.query(TestResult).filter(TestResult.test_case_id == tc.id).order_by(TestResult.executed_at.desc()).first()
    return serialize_test_case(tc, last_res.status.value if last_res else None)

@router.post("/batch-assign-story")
def batch_assign_story(
    payload: BatchAssignUserStoryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not payload.test_case_ids:
        return {"message": "No se enviaron casos para actualizar", "count": 0}
    
    if payload.user_story_id:
        story = db.query(UserStory).filter(UserStory.id == payload.user_story_id).first()
        if not story:
            raise HTTPException(status_code=404, detail="Historia de Usuario no encontrada")
        mismatched = db.query(TestCase).filter(
            TestCase.id.in_(payload.test_case_ids),
            TestCase.project_id != story.project_id
        ).all()
        if mismatched:
            bad_codes = ", ".join([c.code for c in mismatched])
            raise HTTPException(
                status_code=400,
                detail=f"No se permite asociación cruzada entre proyectos. Casos de otro proyecto: {bad_codes}"
            )
        count = db.query(TestCase).filter(
            TestCase.id.in_(payload.test_case_ids),
            TestCase.project_id == story.project_id
        ).update({TestCase.user_story_id: story.id}, synchronize_session=False)
    else:
        count = db.query(TestCase).filter(
            TestCase.id.in_(payload.test_case_ids)
        ).update({TestCase.user_story_id: None}, synchronize_session=False)

    db.commit()
    return {"message": "Asignación completada exitosamente", "count": count}

@router.delete("/{test_case_id}")
def delete_test_case(
    test_case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tc = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Caso de prueba no encontrado")

    results_count = db.query(TestResult).filter(TestResult.test_case_id == test_case_id).count()
    if results_count > 0:
        tc.is_archived = True
        db.commit()
        return {
            "message": f"El caso {tc.code} tiene {results_count} ejecuciones históricas asociadas. Se ha archivado para proteger la trazabilidad de QA sin eliminar sus resultados.",
            "archived": True
        }

    db.delete(tc)
    db.commit()
    return {"message": "Caso de prueba eliminado exitosamente", "archived": False}

