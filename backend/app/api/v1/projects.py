from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Project, Module, TestCase, User, UserStory
from app.schemas.schemas import (
    ProjectCreate, ProjectResponse, ModuleCreate, ModuleResponse,
    UserStoryResponse, UserStoryDetailResponse, TestCaseResponse
)
from app.api.v1.auth import get_current_user
from app.api.v1.user_stories import serialize_user_story, get_user_story_detail, delete_user_story
from app.api.v1.test_cases import serialize_test_case

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    res = []
    for p in projects:
        m_count = len(p.modules)
        tc_count = len([tc for tc in p.test_cases if not tc.is_archived])
        us_count = len(p.user_stories)
        dto = ProjectResponse(
            id=p.id,
            name=p.name,
            key=p.key,
            description=p.description,
            version=p.version,
            status=p.status,
            created_at=p.created_at,
            modules_count=m_count,
            test_cases_count=tc_count,
            user_stories_count=us_count
        )
        res.append(dto)
    return res

@router.post("", response_model=ProjectResponse)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(Project).filter(Project.key == data.key.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project key already exists")
    p = Project(
        name=data.name,
        key=data.key.upper(),
        description=data.description,
        version=data.version,
        created_by_id=current_user.id
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return ProjectResponse(
        id=p.id,
        name=p.name,
        key=p.key,
        description=p.description,
        version=p.version,
        status=p.status,
        created_at=p.created_at,
        modules_count=0,
        test_cases_count=0,
        user_stories_count=0
    )

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return ProjectResponse(
        id=p.id,
        name=p.name,
        key=p.key,
        description=p.description,
        version=p.version,
        status=p.status,
        created_at=p.created_at,
        modules_count=len(p.modules),
        test_cases_count=len([tc for tc in p.test_cases if not tc.is_archived]),
        user_stories_count=len(p.user_stories)
    )

@router.get("/{project_id}/user-stories", response_model=List[UserStoryResponse])
def get_project_user_stories(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    stories = db.query(UserStory).filter(UserStory.project_id == project_id).order_by(UserStory.id.desc()).all()
    return [serialize_user_story(s, db) for s in stories]

@router.get("/{project_id}/user-stories/{story_id}", response_model=UserStoryDetailResponse)
def get_project_user_story_detail(
    project_id: int,
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    story = db.query(UserStory).filter(UserStory.id == story_id, UserStory.project_id == project_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Historia de Usuario no encontrada en este proyecto")
    return get_user_story_detail(story_id=story_id, db=db, current_user=current_user)

@router.delete("/{project_id}/user-stories/{story_id}")
def delete_project_user_story(
    project_id: int,
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    story = db.query(UserStory).filter(UserStory.id == story_id, UserStory.project_id == project_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Historia de Usuario no encontrada en este proyecto")
    return delete_user_story(story_id=story_id, db=db, current_user=current_user)

@router.get("/{project_id}/test-cases", response_model=List[TestCaseResponse])
def get_project_test_cases(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    cases = db.query(TestCase).filter(TestCase.project_id == project_id, TestCase.is_archived == False).all()
    return [serialize_test_case(c) for c in cases]

@router.get("/{project_id}/modules", response_model=List[ModuleResponse])
def get_modules(project_id: int, db: Session = Depends(get_db)):
    return db.query(Module).filter(Module.project_id == project_id).all()

@router.post("/{project_id}/modules", response_model=ModuleResponse)
def create_module(
    project_id: int,
    data: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    mod = Module(project_id=project_id, name=data.name, description=data.description)
    db.add(mod)
    db.commit()
    db.refresh(mod)
    return ModuleResponse.from_orm(mod)
