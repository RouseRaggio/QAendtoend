import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import TestExecution, TestResult, Report, User, TestCase, UserStory
from app.api.v1.auth import get_current_user
from app.reports.pdf_service import PDFReportService

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.post("/executions/{execution_id}/generate")
def generate_report(
    execution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    execution = db.query(TestExecution).filter(TestExecution.id == execution_id).first()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    results = db.query(TestResult).filter(TestResult.execution_id == execution_id).all()
    out_dir = "./uploads/reports"
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, f"report_exec_{execution_id}.pdf")

    PDFReportService.generate_pdf(execution, results, out_file)

    report = Report(
        execution_id=execution.id,
        title=f"Reporte de Pruebas — {execution.name}",
        file_path=out_file,
        metrics_summary={
            "total": len(results),
            "passed": sum(1 for r in results if r.status.value == "PASSED"),
            "bugs": sum(1 for r in results if r.status.value == "BUG"),
            "improvements": sum(1 for r in results if r.status.value == "IMPROVEMENT")
        },
        created_by_id=current_user.id
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {"message": "Report generated successfully", "report_id": report.id, "file_path": out_file}

@router.get("/{report_id}/download")
def download_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report or not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found")
    return FileResponse(
        report.file_path,
        media_type="application/pdf",
        filename=f"Reporte_QA_{report.execution_id}.pdf"
    )

@router.get("/executions/{execution_id}/download-latest")
def download_latest_execution_report(execution_id: int, db: Session = Depends(get_db)):
    execution = db.query(TestExecution).filter(TestExecution.id == execution_id).first()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    results = db.query(TestResult).filter(TestResult.execution_id == execution_id).all()
    out_dir = "./uploads/reports"
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, f"report_exec_{execution_id}.pdf")

    PDFReportService.generate_pdf(execution, results, out_file)
    return FileResponse(
        out_file,
        media_type="application/pdf",
        filename=f"Reporte_QA_{execution.project.name}_{execution.name}.pdf"
    )

@router.get("/user-stories/{story_id}/metrics")
def get_user_story_metrics(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    story = db.query(UserStory).filter(UserStory.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Historia de Usuario no encontrada")

    cases = db.query(TestCase).filter(TestCase.user_story_id == story.id, TestCase.is_archived == False).all()
    case_ids = [c.id for c in cases]
    total_cases = len(cases)

    passed = 0
    bugs = 0
    blocked = 0
    for cid in case_ids:
        latest = db.query(TestResult).filter(TestResult.test_case_id == cid).order_by(TestResult.id.desc()).first()
        if latest:
            if latest.status.value == "PASSED": passed += 1
            elif latest.status.value == "BUG": bugs += 1
            elif latest.status.value == "BLOCKED": blocked += 1

    return {
        "story_id": story.id,
        "story_code": story.code,
        "story_title": story.title,
        "total_cases": total_cases,
        "passed": passed,
        "bugs": bugs,
        "blocked": blocked,
        "pending": max(0, total_cases - (passed + bugs + blocked)),
        "pass_rate": round(passed / total_cases * 100, 1) if total_cases > 0 else 0.0
    }

