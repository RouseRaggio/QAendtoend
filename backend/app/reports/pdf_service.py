import os
import io
import base64
from typing import Dict, Any, List
from jinja2 import Template
from xhtml2pdf import pisa
from app.models.entities import TestExecution, TestResult, Evidence, Bug, Improvement

HTML_REPORT_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: a4 portrait;
    margin: 1.5cm;
  }
  body {
    font-family: Helvetica, Arial, sans-serif;
    color: #172033;
    font-size: 11pt;
    line-height: 1.4;
  }
  .header {
    border-bottom: 2px solid #14b8a6;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  .title {
    font-size: 22pt;
    font-weight: bold;
    color: #102a43;
    margin: 0;
  }
  .subtitle {
    font-size: 11pt;
    color: #64748b;
    margin-top: 5px;
  }
  .metrics-grid {
    margin: 20px 0;
    width: 100%;
  }
  .metric-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 12px;
    text-align: center;
  }
  .metric-num {
    font-size: 20pt;
    font-weight: bold;
    margin-top: 4px;
  }
  .passed { color: #10b981; }
  .bug { color: #ef4444; }
  .improvement { color: #f59e0b; }
  .blocked { color: #8b5cf6; }
  
  table.results-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
    font-size: 10pt;
  }
  table.results-table th {
    background: #102a43;
    color: white;
    text-align: left;
    padding: 8px;
    font-size: 9pt;
  }
  table.results-table td {
    padding: 8px;
    border-bottom: 1px solid #e2e8f0;
  }
  .badge {
    padding: 3px 6px;
    border-radius: 4px;
    font-size: 8pt;
    font-weight: bold;
  }
  .badge-passed { background: #dcfce7; color: #15803d; }
  .badge-bug { background: #fee2e2; color: #b91c1c; }
  .badge-improvement { background: #fef3c7; color: #a16207; }
  .badge-blocked { background: #ede9fe; color: #6d28d9; }
  
  .evidence-section {
    margin-top: 25px;
    page-break-inside: avoid;
  }
  .evidence-box {
    margin-top: 10px;
    padding: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    margin-bottom: 15px;
  }
  .evidence-img {
    max-width: 500px;
    max-height: 280px;
    display: block;
    margin: 8px 0;
  }
  .conclusion {
    background: #ecfeff;
    border-left: 4px solid #14b8a6;
    padding: 12px;
    margin-top: 20px;
    font-size: 10pt;
  }
</style>
</head>
<body>

<div class="header">
  <div style="font-size: 9pt; color: #0f766e; font-weight: bold; text-transform: uppercase;">Informe de Pruebas de Software · TestFlow QA</div>
  <h1 class="title">REPORTE DE PRUEBAS FUNCIONALES</h1>
  <div class="subtitle">{{ execution.project.name }} · {{ execution.name }} · Versión {{ execution.version }} · Ambiente: {{ execution.environment }}</div>
</div>

<table style="width: 100%; margin-bottom: 15px;">
  <tr>
    <td style="width: 50%;"><strong>Responsable QA:</strong> {{ execution.responsible.full_name if execution.responsible else 'Rouse' }}</td>
    <td style="width: 50%; text-align: right;"><strong>Fecha de Generación:</strong> {{ generated_date }}</td>
  </tr>
</table>

<div class="conclusion">
  <strong>Resumen Ejecutivo:</strong> La ejecución registró {{ total_cases }} pruebas funcionales. 
  Tasa de éxito del <strong>{{ pass_pct }}%</strong>. Se detectaron {{ bugs_count }} incidencias (bugs) y {{ improvements_count }} oportunidades de mejora.
</div>

<table style="width: 100%; margin: 15px 0;" cellpadding="5">
  <tr>
    <td style="width: 25%;" class="metric-card">
      <div style="font-size: 9pt; color: #64748b;">Total Pruebas</div>
      <div class="metric-num">{{ total_cases }}</div>
    </td>
    <td style="width: 25%;" class="metric-card">
      <div style="font-size: 9pt; color: #10b981;">Correctas (OK)</div>
      <div class="metric-num passed">{{ passed_count }}</div>
    </td>
    <td style="width: 25%;" class="metric-card">
      <div style="font-size: 9pt; color: #ef4444;">Bugs</div>
      <div class="metric-num bug">{{ bugs_count }}</div>
    </td>
    <td style="width: 25%;" class="metric-card">
      <div style="font-size: 9pt; color: #f59e0b;">Mejoras</div>
      <div class="metric-num improvement">{{ improvements_count }}</div>
    </td>
  </tr>
</table>

<h3>Detalle de Casos de Prueba Ejecutados</h3>
<table class="results-table">
  <thead>
    <tr>
      <th style="width: 15%;">Código</th>
      <th style="width: 35%;">Caso de Prueba</th>
      <th style="width: 15%;">Módulo</th>
      <th style="width: 15%;">Resultado</th>
      <th style="width: 20%;">Severidad</th>
    </tr>
  </thead>
  <tbody>
    {% for r in results %}
    <tr>
      <td><strong>{{ r.test_case.code }}</strong></td>
      <td>{{ r.test_case.title }}</td>
      <td>{{ r.test_case.module.name if r.test_case.module else 'General' }}</td>
      <td>
        {% if r.status.value == 'PASSED' %}
          <span class="badge badge-passed">PASÓ</span>
        {% elif r.status.value == 'BUG' %}
          <span class="badge badge-bug">BUG</span>
        {% elif r.status.value == 'IMPROVEMENT' %}
          <span class="badge badge-improvement">MEJORA</span>
        {% else %}
          <span class="badge badge-blocked">{{ r.status.value }}</span>
        {% endif %}
      </td>
      <td>{{ r.severity.value if r.severity.value != 'NONE' else '—' }}</td>
    </tr>
    {% endfor %}
  </tbody>
</table>

{% if evidences_list %}
<div class="evidence-section">
  <h3>Evidencias Adjuntas y Capturas de Pantalla</h3>
  <p style="font-size: 9pt; color: #64748b;">A continuación se detallan las capturas registradas mediante pegado directo (Ctrl + V) o carga de archivos:</p>
  {% for ev in evidences_list %}
  <div class="evidence-box">
    <div><strong>Caso: {{ ev.case_code }} — {{ ev.case_title }}</strong></div>
    <div style="font-size: 9pt; color: #64748b;">Archivo: {{ ev.file_name }} | Clasificación: {{ ev.status }}</div>
    {% if ev.description %}
    <div style="font-size: 9pt; margin: 4px 0;"><em>Descripción de la evidencia:</em> {{ ev.description }}</div>
    {% endif %}
    {% if ev.base64_data %}
    <img class="evidence-img" src="data:{{ ev.content_type }};base64,{{ ev.base64_data }}" />
    {% endif %}
  </div>
  {% endfor %}
</div>
{% endif %}

<div style="margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 8pt; color: #94a3b8; text-align: center;">
  Documento generado automáticamente por TestFlow QA Platform · Conforme a estándares de Aseguramiento de Calidad
</div>

</body>
</html>
"""

class PDFReportService:
    @staticmethod
    def generate_pdf(
        execution: TestExecution,
        results: List[TestResult],
        output_path: str
    ) -> str:
        total_cases = len(results)
        passed_count = sum(1 for r in results if r.status.value == "PASSED")
        bugs_count = sum(1 for r in results if r.status.value == "BUG")
        improvements_count = sum(1 for r in results if r.status.value == "IMPROVEMENT")
        blocked_count = sum(1 for r in results if r.status.value == "BLOCKED")
        pass_pct = round((passed_count / total_cases * 100), 1) if total_cases > 0 else 0.0

        evidences_list = []
        for r in results:
            for ev in r.evidences:
                base64_data = ""
                if os.path.exists(ev.file_path) and ev.content_type.startswith("image/"):
                    try:
                        with open(ev.file_path, "rb") as f:
                            base64_data = base64.b64encode(f.read()).decode("utf-8")
                    except Exception:
                        pass
                evidences_list.append({
                    "case_code": r.test_case.code,
                    "case_title": r.test_case.title,
                    "status": r.status.value,
                    "file_name": ev.file_name,
                    "content_type": ev.content_type,
                    "description": ev.description,
                    "base64_data": base64_data
                })

        template = Template(HTML_REPORT_TEMPLATE)
        from datetime import datetime
        rendered_html = template.render(
            execution=execution,
            results=results,
            total_cases=total_cases,
            passed_count=passed_count,
            bugs_count=bugs_count,
            improvements_count=improvements_count,
            blocked_count=blocked_count,
            pass_pct=pass_pct,
            evidences_list=evidences_list,
            generated_date=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        )

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as pdf_file:
            pisa_status = pisa.CreatePDF(io.StringIO(rendered_html), dest=pdf_file)
            
        if pisa_status.err:
            raise Exception("Error generating PDF with pisa")

        return output_path
