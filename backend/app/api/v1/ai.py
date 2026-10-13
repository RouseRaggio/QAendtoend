import uuid
import re
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import UserStory, GeneratedTestCase, TestCase, Project, User
from app.schemas.schemas import (
    UserStoryCreate, UserStoryResponse, AIGenerateRequest, AIGenerateResponse,
    ApproveCasesRequest, TestCaseResponse
)
from app.api.v1.auth import get_current_user
from app.ai.factory import get_ai_provider

router = APIRouter(prefix="/ai", tags=["AI Generator"])

@router.post("/generate", response_model=AIGenerateResponse)
async def generate_test_cases(
    data: AIGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Persist or update User Story
    user_story = None
    if data.user_story_id:
        user_story = db.query(UserStory).filter(
            UserStory.id == data.user_story_id,
            UserStory.project_id == data.project_id
        ).first()
        if not user_story:
            raise HTTPException(status_code=404, detail="User Story not found in the specified project")
    else:
        user_story = UserStory(
            project_id=data.project_id,
            title=data.title,
            description=data.story_text,
            story_text=data.story_text,
            acceptance_criteria=data.acceptance_criteria,
            business_rules=data.business_rules,
            created_by_id=current_user.id
        )
        db.add(user_story)
        db.commit()
        db.refresh(user_story)

    # Perform AI analysis & generation
    provider = get_ai_provider()
    analysis = await provider.analyze_user_story(
        story_text=data.story_text,
        acceptance_criteria=data.acceptance_criteria,
        business_rules=data.business_rules or ""
    )
    generated_cases = await provider.generate_test_cases(
        title=data.title,
        story_text=data.story_text,
        acceptance_criteria=data.acceptance_criteria,
        analysis=analysis,
        test_types=data.test_types,
        detail_level=data.detail_level
    )

    # Save to generated_test_cases in DB for traceability
    for idx, c in enumerate(generated_cases):
        code_str = c.temp_code or f"CP-IA-{idx+1:03d}"
        gtc = GeneratedTestCase(
            user_story_id=user_story.id,
            temp_code=code_str,
            title=c.title,
            test_type=c.test_type,
            priority=c.priority,
            preconditions=c.preconditions,
            steps=c.steps,
            expected_result=c.expected_result,
            traceability=c.traceability,
            status="PENDING"
        )
        db.add(gtc)
    db.commit()

    return AIGenerateResponse(
        user_story_id=user_story.id,
        analysis=analysis,
        test_cases=generated_cases
    )

@router.post("/approve", response_model=List[TestCaseResponse])
def approve_cases(
    data: ApproveCasesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_story = db.query(UserStory).filter(UserStory.id == data.user_story_id).first()
    if not user_story:
        raise HTTPException(status_code=404, detail="User Story not found")

    # Determine next code number safely by checking existing codes
    existing_tcs = db.query(TestCase.code).filter(TestCase.project_id == data.project_id).all()
    max_num = 0
    for (c,) in existing_tcs:
        if c:
            m = re.search(r"(?:TC|WF|CP)-(\d+)", c.upper())
            if m:
                try:
                    max_num = max(max_num, int(m.group(1)))
                except ValueError:
                    pass
    if max_num == 0:
        max_num = len(existing_tcs)
    
    created_catalog_cases = []
    for idx, item in enumerate(data.cases):
        code_str = f"TC-{max_num + idx + 1:03d}"
        tc = TestCase(
            project_id=data.project_id,
            module_id=item.module_id,
            code=code_str,
            title=item.title,
            description=f"Generado con IA para H.U.: {user_story.title}",
            preconditions=item.preconditions,
            steps=item.steps,
            expected_result=item.expected_result,
            priority=item.priority,
            tags=item.tags + ["IA-Aprobado"],
            is_ai_generated=True,
            user_story_id=user_story.id,
            created_by_id=current_user.id
        )
        db.add(tc)
        created_catalog_cases.append(tc)

    db.commit()

    res = []
    for c in created_catalog_cases:
        db.refresh(c)
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
            user_story_id=c.user_story_id,
            last_result=None,
            created_at=c.created_at
        ))
    return res
