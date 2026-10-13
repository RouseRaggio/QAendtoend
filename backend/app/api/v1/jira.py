from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.models.entities import UserStory, Project, User
from app.schemas.schemas import JiraImportRequest, UserStoryResponse
from app.api.v1.auth import get_current_user
from app.jira.jira_service import JiraService
from app.api.v1.user_stories import serialize_user_story, get_next_user_story_code

router = APIRouter(prefix="/jira", tags=["Jira Integration"])
jira_service = JiraService()

@router.get("/status")
def get_jira_status():
    return jira_service.is_connected()

@router.get("/issues/{issue_key}")
async def get_jira_issue(issue_key: str):
    try:
        data = await jira_service.get_issue(issue_key)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/import-story", response_model=UserStoryResponse)
async def import_jira_story(
    payload: JiraImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    conn = jira_service.is_connected()
    if not conn.get("configured", False):
        raise HTTPException(
            status_code=400,
            detail=(
                "La integración con Jira no está completamente configurada en el servidor. "
                "Para importar incidencias reales se requiere definir JIRA_EMAIL y JIRA_API_TOKEN "
                "en las variables de entorno del backend."
            )
        )

    try:
        data = await jira_service.get_issue(payload.issue_key)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al consultar Jira: {str(e)}")

    existing = db.query(UserStory).filter(
        UserStory.project_id == payload.project_id,
        UserStory.jira_key == payload.issue_key.upper()
    ).first()
    if existing:
        return serialize_user_story(existing, db)

    code = get_next_user_story_code(db, payload.project_id)
    story = UserStory(
        project_id=payload.project_id,
        code=code,
        title=data.get("title", f"Historia Jira {payload.issue_key}"),
        description=data.get("story_text", ""),
        story_text=data.get("story_text", ""),
        acceptance_criteria=data.get("acceptance_criteria", []),
        business_rules=data.get("business_rules", ""),
        jira_key=payload.issue_key.upper(),
        status="TODO",
        created_by_id=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    return serialize_user_story(story, db)
