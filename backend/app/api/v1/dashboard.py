from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Project, TestExecution, TestResult, Bug, Improvement, TestStatus, SeverityLevel, BugStatus
from app.schemas.schemas import DashboardMetrics, TestResultResponse, EvidenceResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/metrics", response_model=DashboardMetrics)
def get_dashboard_metrics(project_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    # Find active project
    if project_id:
        proj = db.query(Project).filter(Project.id == project_id).first()
    else:
        proj = db.query(Project).filter(Project.key == "GESTADOC").first() or db.query(Project).first()

    if not proj:
        return DashboardMetrics(
            active_project_id=0,
            active_project_name="Sin Proyecto",
            total_test_cases=0,
            executed_tests=0,
            passed=0,
            bugs=0,
            improvements=0,
            blocked=0,
            not_executed=0,
            execution_progress_pct=0.0,
            pass_pct=0.0,
            bug_pct=0.0,
            improvement_pct=0.0,
            open_bugs_count=0,
            high_severity_bugs_count=0,
            pending_improvements_count=0,
            resolved_count=0
        )

    # Active execution: prefer latest execution with evaluated pass results, or latest overall
    exec_obj = (
        db.query(TestExecution)
        .join(TestResult, TestResult.execution_id == TestExecution.id)
        .filter(TestExecution.project_id == proj.id, TestResult.status == TestStatus.PASSED)
        .order_by(TestExecution.id.desc())
        .first()
    )
    if not exec_obj:
        exec_obj = db.query(TestExecution).filter(TestExecution.project_id == proj.id).order_by(TestExecution.id.desc()).first()
    
    if exec_obj:
        results = db.query(TestResult).filter(TestResult.execution_id == exec_obj.id).all()
        active_exec_id = exec_obj.id
        active_exec_name = f"{exec_obj.name} ({exec_obj.version})"
    else:
        results = []
        active_exec_id = None
        active_exec_name = None

    total = len(results)
    passed = sum(1 for r in results if r.status == TestStatus.PASSED)
    bugs = sum(1 for r in results if r.status == TestStatus.BUG)
    improvements = sum(1 for r in results if r.status == TestStatus.IMPROVEMENT)
    blocked = sum(1 for r in results if r.status == TestStatus.BLOCKED)
    not_executed = sum(1 for r in results if r.status == TestStatus.NOT_EXECUTED)
    executed = total - not_executed

    prog_pct = round((executed / total * 100), 1) if total > 0 else 0.0
    pass_pct = round((passed / total * 100), 1) if total > 0 else 0.0
    bug_pct = round((bugs / total * 100), 1) if total > 0 else 0.0
    imp_pct = round((improvements / total * 100), 1) if total > 0 else 0.0

    # Recent results
    recent_db = db.query(TestResult).filter(TestResult.execution_id == active_exec_id).order_by(TestResult.executed_at.desc()).limit(10).all() if active_exec_id else []
    recent_list = []
    for r in recent_db:
        evs = [EvidenceResponse.from_orm(e) for e in r.evidences]
        recent_list.append(TestResultResponse(
            id=r.id,
            execution_id=r.execution_id,
            test_case_id=r.test_case_id,
            test_case_code=r.test_case.code if r.test_case else None,
            test_case_title=r.test_case.title if r.test_case else None,
            module_name=r.test_case.module.name if r.test_case and r.test_case.module else None,
            status=r.status,
            expected_result=r.expected_result,
            actual_result=r.actual_result,
            severity=r.severity,
            priority=r.priority,
            observations=r.observations,
            executed_by_name=r.executed_by.full_name if r.executed_by else None,
            executed_at=r.executed_at,
            evidences=evs,
            bug_id=r.bug.id if r.bug else None,
            improvement_id=r.improvement.id if r.improvement else None
        ))

    open_bugs = db.query(Bug).filter(Bug.project_id == proj.id, Bug.status == BugStatus.OPEN).count()
    high_sev_bugs = db.query(Bug).filter(
        Bug.project_id == proj.id,
        Bug.severity.in_([SeverityLevel.HIGH, SeverityLevel.CRITICAL])
    ).count()
    pending_imps = db.query(Improvement).filter(Improvement.project_id == proj.id).count()
    resolved = db.query(Bug).filter(Bug.project_id == proj.id, Bug.status == BugStatus.RESOLVED).count()

    return DashboardMetrics(
        active_project_id=proj.id,
        active_project_name=proj.name,
        active_execution_id=active_exec_id,
        active_execution_name=active_exec_name,
        total_test_cases=total,
        executed_tests=executed,
        passed=passed,
        bugs=bugs,
        improvements=improvements,
        blocked=blocked,
        not_executed=not_executed,
        execution_progress_pct=prog_pct,
        pass_pct=pass_pct,
        bug_pct=bug_pct,
        improvement_pct=imp_pct,
        recent_results=recent_list,
        open_bugs_count=open_bugs,
        high_severity_bugs_count=high_sev_bugs,
        pending_improvements_count=pending_imps,
        resolved_count=resolved
    )
