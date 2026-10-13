with open('README.md', 'w', encoding='utf-8') as f:
    f.write('''# TestFlow QA

**TestFlow QA** is an enterprise-grade functional test management and AI-assisted QA platform built to replace slow, repetitive Word document reporting with a structured, collaborative SaaS platform.

---

## Key Features

1. **Test Management & Catalog**: Complete test case creation, organization by modules, tagging, priority, and Excel export/import support.
2. **Test Executions**: Plan and track test runs by version and environment (QA, Staging, Production).
3. **Execution & Direct Clipboard Screenshot Evidence**:
   - Focusable drop zone with **Ctrl + V** clipboard listener.
   - Strict filter for supported image MIME types (image/png, image/jpeg, image/webp).
   - Non-image clipboard data is ignored with subtle notification: *"No image found in clipboard. Copy a screenshot and try again."*
   - Immediate local thumbnail preview generation without requiring files to be saved to disk first.
   - Multiple screenshots per test result with individual descriptions and delete buttons before saving.
4. **Automatic Bug & Improvement Association**:
   - Marking a test result as **BUG** automatically generates a tracked Bug entity linked to the test case and execution, associating all uploaded/pasted evidence.
   - Marking as **IMPROVEMENT** automatically registers an improvement item.
5. **AI Test Generator**:
   - Dual-source: Manual User Story or Jira issue key (GEST-124).
   - Structured analysis (Requirements, Business Rules, Roles, Risks, Ambiguities).
   - Generates positive, negative, validation, boundary, security, and API tests.
   - QA review workflow: inline inspection, deletion, and bulk approval into the catalog with full traceability.
6. **Executive PDF Reports**:
   - Generates professional PDF summary reports with test metrics, distribution, and embedded screenshot evidence with tester descriptions.

---

## Quickstart

### 1. Run with Docker Compose
`ash
docker compose up --build
`
- Frontend: http://localhost:3000
- Backend API Docs: http://localhost:8000/docs

### 2. Run Locally for Development

#### Backend (FastAPI + Python 3.11/3.14)
`ash
cd backend
python -m venv venv
.\\venv\\Scripts\\activate
pip install -r requirements.txt email-validator
python -m uvicorn app.main:app --reload --port 8000
`

#### Frontend (React + TypeScript + Vite + Tailwind CSS)
`ash
cd frontend
npm install
npm run dev
`
Open http://localhost:5173

#### Default Credentials
- **Email**: qa@gestadoc.com
- **Password**: qa123456
''')
print('README.md written successfully')
