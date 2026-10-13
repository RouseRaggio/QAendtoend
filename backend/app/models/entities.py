import re
from datetime import datetime
import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean, JSON, Table, UniqueConstraint, event, text
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    QA = "QA"
    DEVELOPER = "DEVELOPER"
    VIEWER = "VIEWER"

class TestPriority(str, enum.Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"

class TestStatus(str, enum.Enum):
    NOT_EXECUTED = "NOT_EXECUTED"
    IN_PROGRESS = "IN_PROGRESS"
    PASSED = "PASSED"
    BUG = "BUG"
    IMPROVEMENT = "IMPROVEMENT"
    BLOCKED = "BLOCKED"

class SeverityLevel(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    NONE = "NONE"

class BugStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    REJECTED = "REJECTED"
    REOPENED = "REOPENED"

class GeneratedCaseType(str, enum.Enum):
    POSITIVE = "POSITIVE"
    NEGATIVE = "NEGATIVE"
    VALIDATION = "VALIDATION"
    BOUNDARY = "BOUNDARY"
    SECURITY = "SECURITY"
    INTEGRATION = "INTEGRATION"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.QA, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    key = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    version = Column(String, default="v1.0.0")
    status = Column(String, default="ACTIVE")
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    modules = relationship("Module", back_populates="project", cascade="all, delete-orphan")
    test_cases = relationship("TestCase", back_populates="project", cascade="all, delete-orphan")
    executions = relationship("TestExecution", back_populates="project", cascade="all, delete-orphan")
    bugs = relationship("Bug", back_populates="project", cascade="all, delete-orphan")
    improvements = relationship("Improvement", back_populates="project", cascade="all, delete-orphan")
    user_stories = relationship("UserStory", back_populates="project", cascade="all, delete-orphan")

class Module(Base):
    __tablename__ = "modules"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    project = relationship("Project", back_populates="modules")
    test_cases = relationship("TestCase", back_populates="module")

class TestCase(Base):
    __tablename__ = "test_cases"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    code = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    preconditions = Column(Text, nullable=True)
    steps = Column(JSON, default=list)  # list of step strings
    expected_result = Column(Text, nullable=False)
    priority = Column(Enum(TestPriority), default=TestPriority.P2)
    tags = Column(JSON, default=list)
    is_ai_generated = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    user_story_id = Column(Integer, ForeignKey("user_stories.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="test_cases")
    module = relationship("Module", back_populates="test_cases")
    results = relationship("TestResult", back_populates="test_case")
    user_story = relationship("UserStory", back_populates="test_cases")

execution_user_stories = Table(
    "execution_user_stories",
    Base.metadata,
    Column("execution_id", Integer, ForeignKey("test_executions.id", ondelete="CASCADE"), primary_key=True),
    Column("user_story_id", Integer, ForeignKey("user_stories.id", ondelete="CASCADE"), primary_key=True)
)

class TestExecution(Base):
    __tablename__ = "test_executions"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    version = Column(String, default="v1.0.0")
    environment = Column(String, default="QA")
    status = Column(String, default="EN_EJECUCION")  # PENDIENTE, EN_EJECUCION, FINALIZADA, CANCELADA
    responsible_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="executions")
    results = relationship("TestResult", back_populates="execution", cascade="all, delete-orphan", order_by="TestResult.order_index")
    responsible = relationship("User", foreign_keys=[responsible_id])
    user_stories = relationship("UserStory", secondary=execution_user_stories, back_populates="executions")

class TestResult(Base):
    __tablename__ = "test_results"
    id = Column(Integer, primary_key=True, index=True)
    execution_id = Column(Integer, ForeignKey("test_executions.id"), nullable=False)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=False)
    status = Column(Enum(TestStatus), default=TestStatus.NOT_EXECUTED, nullable=False)
    order_index = Column(Integer, default=0)
    expected_result = Column(Text, nullable=True)
    actual_result = Column(Text, nullable=True)
    severity = Column(Enum(SeverityLevel), default=SeverityLevel.NONE)
    priority = Column(Enum(TestPriority), default=TestPriority.P2)
    observations = Column(Text, nullable=True)
    executed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    executed_at = Column(DateTime, default=datetime.utcnow)

    execution = relationship("TestExecution", back_populates="results")
    test_case = relationship("TestCase", back_populates="results")
    executed_by = relationship("User", foreign_keys=[executed_by_id])
    evidences = relationship("Evidence", back_populates="test_result", cascade="all, delete-orphan", order_by="[Evidence.display_order, Evidence.id]")
    bug = relationship("Bug", back_populates="test_result", uselist=False)
    improvement = relationship("Improvement", back_populates="test_result", uselist=False)

class Evidence(Base):
    __tablename__ = "evidences"
    id = Column(Integer, primary_key=True, index=True)
    test_result_id = Column(Integer, ForeignKey("test_results.id"), nullable=False)
    bug_id = Column(Integer, ForeignKey("bugs.id"), nullable=True)
    improvement_id = Column(Integer, ForeignKey("improvements.id"), nullable=True)
    file_name = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_path = Column(String, nullable=False)
    description = Column(String, nullable=True)
    display_order = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    test_result = relationship("TestResult", back_populates="evidences")
    bug = relationship("Bug", back_populates="evidences")
    improvement = relationship("Improvement", back_populates="evidences")

class Bug(Base):
    __tablename__ = "bugs"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=True)
    test_result_id = Column(Integer, ForeignKey("test_results.id"), nullable=True)
    execution_id = Column(Integer, ForeignKey("test_executions.id"), nullable=True)
    steps_to_reproduce = Column(Text, nullable=True)
    severity = Column(Enum(SeverityLevel), default=SeverityLevel.MEDIUM)
    priority = Column(Enum(TestPriority), default=TestPriority.P2)
    status = Column(Enum(BugStatus), default=BugStatus.OPEN)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="bugs")
    test_result = relationship("TestResult", back_populates="bug")
    evidences = relationship("Evidence", back_populates="bug")
    assignee = relationship("User", foreign_keys=[assignee_id])
    created_by = relationship("User", foreign_keys=[created_by_id])

class Improvement(Base):
    __tablename__ = "improvements"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=True)
    test_result_id = Column(Integer, ForeignKey("test_results.id"), nullable=True)
    priority = Column(Enum(TestPriority), default=TestPriority.P3)
    status = Column(String, default="PENDING")
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="improvements")
    test_result = relationship("TestResult", back_populates="improvement")
    evidences = relationship("Evidence", back_populates="improvement")
def generate_user_story_code(context):
    try:
        connection = context.connection
        params = context.get_current_parameters()
        project_id = params.get("project_id", 1)
        result = connection.execute(
            text("SELECT code FROM user_stories WHERE project_id = :pid AND code LIKE 'HU-%'"),
            {"pid": project_id}
        )
        max_num = 0
        for row in result:
            m = re.search(r"HU-(\d+)", row[0] or "")
            if m:
                max_num = max(max_num, int(m.group(1)))
        return f"HU-{max_num + 1:03d}"
    except Exception:
        return "HU-001"

class UserStory(Base):
    __tablename__ = "user_stories"
    __table_args__ = (
        UniqueConstraint("project_id", "code", name="uq_project_user_story_code"),
    )
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    code = Column(String, default=generate_user_story_code, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    story_text = Column(Text, nullable=True)
    status = Column(String, default="TODO")  # BACKLOG, TODO, IN_PROGRESS, TESTING, DONE, ACCEPTED
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    jira_key = Column(String, nullable=True, index=True)
    acceptance_criteria = Column(JSON, default=list)  # list of strings
    business_rules = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="user_stories")
    module = relationship("Module")
    assignee = relationship("User", foreign_keys=[assignee_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    test_cases = relationship("TestCase", back_populates="user_story")
    generated_cases = relationship("GeneratedTestCase", back_populates="user_story", cascade="all, delete-orphan")
    executions = relationship("TestExecution", secondary=execution_user_stories, back_populates="user_stories")

@event.listens_for(UserStory, "before_insert")
def set_user_story_defaults(mapper, connection, target):
    if not target.description and target.story_text:
        target.description = target.story_text
    elif not target.story_text and target.description:
        target.story_text = target.description

    if not target.code:
        result = connection.execute(
            text("SELECT code FROM user_stories WHERE project_id = :pid AND code LIKE 'HU-%'"),
            {"pid": target.project_id}
        )
        max_num = 0
        for row in result:
            m = re.search(r"HU-(\d+)", row[0] or "")
            if m:
                max_num = max(max_num, int(m.group(1)))
        target.code = f"HU-{max_num + 1:03d}"

@event.listens_for(UserStory, "before_update")
def sync_user_story_description(mapper, connection, target):
    if target.description and not target.story_text:
        target.story_text = target.description
    elif target.story_text and not target.description:
        target.description = target.story_text

class GeneratedTestCase(Base):
    __tablename__ = "generated_test_cases"
    id = Column(Integer, primary_key=True, index=True)
    user_story_id = Column(Integer, ForeignKey("user_stories.id"), nullable=False)
    temp_code = Column(String, nullable=False)
    title = Column(String, nullable=False)
    test_type = Column(Enum(GeneratedCaseType), default=GeneratedCaseType.POSITIVE)
    priority = Column(Enum(TestPriority), default=TestPriority.P2)
    preconditions = Column(Text, nullable=True)
    steps = Column(JSON, default=list)
    expected_result = Column(Text, nullable=False)
    traceability = Column(JSON, default=list)
    status = Column(String, default="PENDING")  # PENDING, APPROVED, REJECTED
    approved_test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user_story = relationship("UserStory", back_populates="generated_cases")

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    execution_id = Column(Integer, ForeignKey("test_executions.id"), nullable=False)
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    metrics_summary = Column(JSON, default=dict)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
