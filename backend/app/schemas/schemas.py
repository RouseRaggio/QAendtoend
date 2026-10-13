from typing import Optional, List, Any, Dict
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.models.entities import UserRole, TestPriority, TestStatus, SeverityLevel, BugStatus, GeneratedCaseType

# Auth & User
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Evidence
class EvidenceResponse(BaseModel):
    id: int
    test_result_id: int
    bug_id: Optional[int] = None
    improvement_id: Optional[int] = None
    file_name: str
    content_type: str
    file_size: int
    file_path: str
    description: Optional[str] = None
    display_order: int
    uploaded_at: datetime
    class Config:
        from_attributes = True

# Projects & Modules
class ModuleCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ModuleResponse(BaseModel):
    id: int
    project_id: int
    name: str
    description: Optional[str] = None
    class Config:
        from_attributes = True

class ProjectCreate(BaseModel):
    name: str
    key: str
    description: Optional[str] = None
    version: str = "v1.0.0"

class ProjectResponse(BaseModel):
    id: int
    name: str
    key: str
    description: Optional[str] = None
    version: str
    status: str
    created_at: datetime
    modules_count: int = 0
    test_cases_count: int = 0
    user_stories_count: int = 0
    class Config:
        from_attributes = True

# Test Cases
class TestCaseCreate(BaseModel):
    project_id: int
    module_id: Optional[int] = None
    code: str
    title: str
    description: Optional[str] = None
    preconditions: Optional[str] = None
    steps: List[str] = []
    expected_result: str
    priority: TestPriority = TestPriority.P2
    tags: List[str] = []
    is_ai_generated: bool = False
    user_story_id: Optional[int] = None

class TestCaseUpdate(BaseModel):
    module_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    preconditions: Optional[str] = None
    steps: Optional[List[str]] = None
    expected_result: Optional[str] = None
    priority: Optional[TestPriority] = None
    tags: Optional[List[str]] = None
    user_story_id: Optional[int] = None

class TestCaseResponse(BaseModel):
    id: int
    project_id: int
    module_id: Optional[int] = None
    module_name: Optional[str] = None
    code: str
    title: str
    description: Optional[str] = None
    preconditions: Optional[str] = None
    steps: List[str] = []
    expected_result: str
    priority: TestPriority
    tags: List[str] = []
    is_ai_generated: bool
    is_archived: bool = False
    user_story_id: Optional[int] = None
    user_story_code: Optional[str] = None
    user_story_title: Optional[str] = None
    last_result: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class PaginatedTestCasesResponse(BaseModel):
    items: List[TestCaseResponse]
    total: int
    page: int
    page_size: int
    pages: int

class ImportPreviewItem(BaseModel):
    row_number: int
    code: str
    title: str
    module_name: Optional[str] = None
    description: Optional[str] = None
    preconditions: Optional[str] = None
    steps: List[str] = []
    expected_result: str
    priority: str
    status: str  # VALID, WARNING, ERROR
    message: str
    exists_in_db: bool = False

class ImportPreviewResponse(BaseModel):
    filename: str
    total_rows: int
    valid_count: int
    warning_count: int
    error_count: int
    items: List[ImportPreviewItem]

class ImportCommitItem(BaseModel):
    row_number: int
    code: str
    title: str
    module_name: Optional[str] = None
    description: Optional[str] = None
    preconditions: Optional[str] = None
    steps: List[str] = []
    expected_result: str
    priority: str

class ImportCommitRequest(BaseModel):
    project_id: int
    user_story_id: Optional[int] = None
    strategy: str  # SKIP, UPDATE, CANCEL
    items: List[ImportCommitItem]

class ImportCommitResponse(BaseModel):
    processed: int
    created: int
    updated: int
    skipped: int
    errors: List[dict]
    total_associated_cases: Optional[int] = None

# Test Execution
# Test Execution
class ExecutionCreate(BaseModel):
    project_id: int
    name: str
    description: Optional[str] = None
    version: str = "v1.0.0"
    environment: str = "QA"
    user_story_ids: Optional[List[int]] = None
    test_case_ids: Optional[List[int]] = None

class ExecutionResponse(BaseModel):
    id: int
    project_id: int
    project_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    version: str
    environment: str
    status: str
    total_cases: int = 0
    executed_count: int = 0
    passed_count: int = 0
    bugs_count: int = 0
    improvements_count: int = 0
    blocked_count: int = 0
    pending_count: int = 0
    in_progress_count: int = 0
    progress_percentage: float = 0.0
    responsible_name: Optional[str] = None
    user_story_ids: List[int] = []
    user_story_codes: List[str] = []
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Test Results & Registration
class ResultRegisterRequest(BaseModel):
    test_case_id: int
    status: TestStatus
    expected_result: Optional[str] = None
    actual_result: Optional[str] = None
    severity: SeverityLevel = SeverityLevel.NONE
    priority: TestPriority = TestPriority.P2
    observations: Optional[str] = None

class TestResultResponse(BaseModel):
    id: int
    execution_id: int
    test_case_id: int
    test_case_code: Optional[str] = None
    test_case_title: Optional[str] = None
    module_name: Optional[str] = None
    order_index: int = 0
    status: TestStatus
    expected_result: Optional[str] = None
    actual_result: Optional[str] = None
    severity: SeverityLevel
    priority: TestPriority
    observations: Optional[str] = None
    executed_by_name: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    evidences: List[EvidenceResponse] = []
    bug_id: Optional[int] = None
    improvement_id: Optional[int] = None
    class Config:
        from_attributes = True

class ExecutionCaseItemResponse(BaseModel):
    id: int
    execution_id: int
    test_case_id: int
    order_index: int
    code: str
    title: str
    module_name: Optional[str] = None
    user_story_id: Optional[int] = None
    user_story_code: Optional[str] = None
    user_story_title: Optional[str] = None
    description: Optional[str] = None
    preconditions: Optional[str] = None
    steps: List[str] = []
    expected_result: str
    priority: str
    status: str
    actual_result: Optional[str] = None
    severity: str
    observations: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    evidences: List[EvidenceResponse] = []
    bug_id: Optional[int] = None
    improvement_id: Optional[int] = None

class ExecutionDetailResponse(BaseModel):
    id: int
    project_id: int
    project_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    version: str
    environment: str
    status: str
    responsible_name: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    total_cases: int = 0
    passed_count: int = 0
    bugs_count: int = 0
    improvements_count: int = 0
    blocked_count: int = 0
    pending_count: int = 0
    in_progress_count: int = 0
    executed_count: int = 0
    progress_percentage: float = 0.0
    user_story_ids: List[int] = []
    user_stories: List[Dict[str, Any]] = []
    cases: List[ExecutionCaseItemResponse] = []
    class Config:
        from_attributes = True

# Bugs & Improvements
class BugResponse(BaseModel):
    id: int
    code: str
    title: str
    description: Optional[str] = None
    project_id: int
    project_name: Optional[str] = None
    module_name: Optional[str] = None
    test_case_id: Optional[int] = None
    test_case_code: Optional[str] = None
    test_result_id: Optional[int] = None
    execution_id: Optional[int] = None
    steps_to_reproduce: Optional[str] = None
    severity: SeverityLevel
    priority: TestPriority
    status: BugStatus
    assignee_name: Optional[str] = None
    created_at: datetime
    evidences: List[EvidenceResponse] = []
    class Config:
        from_attributes = True

class ImprovementResponse(BaseModel):
    id: int
    code: str
    title: str
    description: Optional[str] = None
    project_id: int
    module_name: Optional[str] = None
    test_case_code: Optional[str] = None
    test_result_id: Optional[int] = None
    priority: TestPriority
    status: str
    created_at: datetime
    evidences: List[EvidenceResponse] = []
    class Config:
        from_attributes = True

# User Story & AI
class UserStoryCreate(BaseModel):
    project_id: int
    module_id: Optional[int] = None
    code: Optional[str] = None
    title: str
    description: Optional[str] = None
    story_text: Optional[str] = None
    status: Optional[str] = "TODO"
    assignee_id: Optional[int] = None
    jira_key: Optional[str] = None
    acceptance_criteria: List[str] = []
    business_rules: Optional[str] = None

class UserStoryUpdate(BaseModel):
    project_id: Optional[int] = None
    module_id: Optional[int] = None
    code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    story_text: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[int] = None
    jira_key: Optional[str] = None
    acceptance_criteria: Optional[List[str]] = None
    business_rules: Optional[str] = None

class UserStoryResponse(BaseModel):
    id: int
    project_id: int
    project_name: Optional[str] = None
    module_id: Optional[int] = None
    module_name: Optional[str] = None
    code: str
    title: str
    description: Optional[str] = None
    story_text: Optional[str] = None
    status: str = "TODO"
    assignee_id: Optional[int] = None
    assignee_name: Optional[str] = None
    jira_key: Optional[str] = None
    acceptance_criteria: List[str] = []
    business_rules: Optional[str] = None
    test_cases_count: int = 0
    latest_execution_status: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class UserStoryDetailResponse(UserStoryResponse):
    test_cases: List[TestCaseResponse] = []
    executions: List[Dict[str, Any]] = []
    metrics: Dict[str, Any] = {}

class BatchAssignUserStoryRequest(BaseModel):
    test_case_ids: List[int]
    user_story_id: Optional[int] = None

class JiraImportRequest(BaseModel):
    project_id: int
    issue_key: str

class AIAnalysisResult(BaseModel):
    requirements: List[str] = []
    business_rules: List[str] = []
    roles: List[str] = []
    risks: List[str] = []
    ambiguities: List[str] = []

class AIGeneratedCase(BaseModel):
    temp_code: Optional[str] = None
    title: str
    test_type: GeneratedCaseType = GeneratedCaseType.POSITIVE
    priority: TestPriority = TestPriority.P2
    preconditions: str = ""
    steps: List[str] = []
    expected_result: str
    traceability: List[str] = []

class AIGenerateRequest(BaseModel):
    project_id: int
    user_story_id: Optional[int] = None
    title: str
    story_text: str
    acceptance_criteria: List[str] = []
    business_rules: Optional[str] = None
    test_types: List[str] = ["POSITIVE", "NEGATIVE", "VALIDATION", "BOUNDARY"]
    detail_level: str = "HIGH"

class AIGenerateResponse(BaseModel):
    user_story_id: int
    analysis: AIAnalysisResult
    test_cases: List[AIGeneratedCase]

class ApproveCaseItem(BaseModel):
    title: str
    preconditions: Optional[str] = None
    steps: List[str] = []
    expected_result: str
    priority: TestPriority = TestPriority.P2
    module_id: Optional[int] = None
    tags: List[str] = []
    traceability: List[str] = []

class ApproveCasesRequest(BaseModel):
    project_id: int
    user_story_id: int
    cases: List[ApproveCaseItem]

# Dashboard Metrics
class DashboardMetrics(BaseModel):
    active_project_id: int
    active_project_name: str
    active_execution_id: Optional[int] = None
    active_execution_name: Optional[str] = None
    total_test_cases: int
    executed_tests: int
    passed: int
    bugs: int
    improvements: int
    blocked: int
    not_executed: int
    execution_progress_pct: float
    pass_pct: float
    bug_pct: float
    improvement_pct: float
    recent_results: List[TestResultResponse] = []
    open_bugs_count: int
    high_severity_bugs_count: int
    pending_improvements_count: int
    resolved_count: int
