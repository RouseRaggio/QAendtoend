from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.models.entities import (
    User, UserRole, Project, Module, TestCase, TestExecution,
    TestResult, Bug, Improvement, TestStatus, SeverityLevel, TestPriority, BugStatus
)

def seed_database(db: Session):
    # Check if already seeded
    if db.query(User).filter(User.email == "qa@gestadoc.com").first():
        return

    # 1. Users
    rouse = User(
        email="qa@gestadoc.com",
        hashed_password=get_password_hash("qa123456"),
        full_name="Rouse",
        role=UserRole.QA
    )
    admin = User(
        email="admin@testflow.com",
        hashed_password=get_password_hash("admin123456"),
        full_name="Admin Master",
        role=UserRole.ADMIN
    )
    db.add_all([rouse, admin])
    db.commit()
    db.refresh(rouse)

    # 2. Projects
    gestadoc = Project(
        name="GESTADOC",
        key="GEST",
        description="Sistema de gestión documental y automatización de flujos de trabajo institucionales",
        version="v1.4.2",
        status="ACTIVE",
        created_by_id=rouse.id
    )
    demo_proj = Project(
        name="Proyecto Demo",
        key="DEMO",
        description="Proyecto de ejemplo para pruebas exploratorias",
        version="v0.1.0",
        status="PENDING",
        created_by_id=rouse.id
    )
    db.add_all([gestadoc, demo_proj])
    db.commit()
    db.refresh(gestadoc)

    # 3. Modules
    mod_proc = Module(project_id=gestadoc.id, name="Procesos", description="Diseño y modelado de procesos BPMN")
    mod_cat = Module(project_id=gestadoc.id, name="Catálogo", description="Búsqueda y visualización de expedientes")
    mod_fuid = Module(project_id=gestadoc.id, name="FUID", description="Formato Único de Inventario Documental")
    mod_wf = Module(project_id=gestadoc.id, name="Workflow", description="Motor de orquestación de tareas")
    db.add_all([mod_proc, mod_cat, mod_fuid, mod_wf])
    db.commit()
    db.refresh(mod_proc)
    db.refresh(mod_cat)

    # 4. Test Cases (Create 45 cases matching mockup: 32 OK, 7 Bug, 6 Mejora)
    tc_list = []
    tc1 = TestCase(
        project_id=gestadoc.id, module_id=mod_proc.id, code="WF-001",
        title="Crear nuevo proceso BPMN",
        description="Verificar la creación exitosa de un proceso con datos válidos",
        preconditions="Usuario autenticado con permisos de administrador",
        steps=["Abrir Workflow", "Abrir Procesos", "Hacer clic en 'Nuevo proceso'", "Llenar formulario", "Guardar"],
        expected_result="El proceso se crea y se visualiza en el catálogo de procesos",
        priority=TestPriority.P1, tags=["Workflow", "Creación"]
    )
    tc2 = TestCase(
        project_id=gestadoc.id, module_id=mod_proc.id, code="WF-002",
        title="Editar información del proceso",
        description="Modificar nombre y metadatos del proceso existente",
        preconditions="Proceso existente en catálogo",
        steps=["Seleccionar proceso", "Clic en Editar", "Modificar nombre", "Guardar cambios"],
        expected_result="El proceso refleja los datos actualizados",
        priority=TestPriority.P2, tags=["Workflow", "Edición"]
    )
    tc3 = TestCase(
        project_id=gestadoc.id, module_id=mod_proc.id, code="WF-003",
        title="Guardar proceso después de editar",
        description="Verificar persistencia real tras guardar cambios en la edición",
        preconditions="Usuario autenticado con permisos de edición y proceso existente",
        steps=["Ingresar al módulo Workflow", "Seleccionar proceso existente", "Presionar Editar", "Modificar el nombre del proceso", "Presionar Guardar"],
        expected_result="El sistema debe guardar los cambios y mostrar la información actualizada en el catálogo.",
        priority=TestPriority.P1, tags=["Workflow", "Crítico"]
    )
    tc4 = TestCase(
        project_id=gestadoc.id, module_id=mod_cat.id, code="WF-004",
        title="Filtrar procesos por categoría",
        description="Validar listado de procesos filtrados",
        preconditions="Existen procesos en diversas categorías",
        steps=["Ir a Catálogo", "Seleccionar categoría Finanzas", "Aplicar filtro"],
        expected_result="Se muestran únicamente procesos asignados a Finanzas",
        priority=TestPriority.P3, tags=["Catálogo", "Filtros"]
    )
    tc_list.extend([tc1, tc2, tc3, tc4])

    for i in range(5, 46):
        m = mod_proc if i % 2 == 0 else mod_cat
        tc = TestCase(
            project_id=gestadoc.id, module_id=m.id, code=f"WF-{i:03d}",
            title=f"Validación funcional escenario {i}",
            description=f"Escenario de validación de reglas de negocio número {i}",
            preconditions="Sesión activa",
            steps=["Paso 1: Navegar a pantalla", "Paso 2: Ejecutar acción de prueba", "Paso 3: Validar respuesta"],
            expected_result=f"Operación {i} responde de acuerdo a los criterios de aceptación",
            priority=TestPriority.P2 if i % 3 != 0 else TestPriority.P1,
            tags=["Funcional"]
        )
        tc_list.append(tc)

    db.add_all(tc_list)
    db.commit()

    # 5. Execution (Functional Testing - Workflow, v1.4.2)
    exec1 = TestExecution(
        project_id=gestadoc.id,
        name="Pruebas funcionales — Workflow",
        version="v1.4.2",
        environment="QA",
        status="COMPLETED",
        responsible_id=rouse.id
    )
    db.add(exec1)
    db.commit()
    db.refresh(exec1)

    # 6. Results distribution: 32 OK, 7 Bugs, 6 Improvements (Total 45)
    results = []
    # 32 Passed
    for i in range(0, 32):
        tc = tc_list[i]
        tr = TestResult(
            execution_id=exec1.id,
            test_case_id=tc.id,
            status=TestStatus.PASSED,
            expected_result=tc.expected_result,
            actual_result="Comportamiento verificado correctamente acorde a la especificación.",
            severity=SeverityLevel.NONE,
            priority=tc.priority,
            executed_by_id=rouse.id
        )
        results.append(tr)
    
    # 7 Bugs
    bug_objs = []
    for i in range(32, 39):
        tc = tc_list[i]
        sev = SeverityLevel.HIGH if i in [32, 33] else SeverityLevel.MEDIUM
        tr = TestResult(
            execution_id=exec1.id,
            test_case_id=tc.id,
            status=TestStatus.BUG,
            expected_result=tc.expected_result,
            actual_result=f"Error inesperado al ejecutar {tc.code}: mensaje de excepción o persistencia fallida.",
            severity=sev,
            priority=TestPriority.P1 if sev == SeverityLevel.HIGH else TestPriority.P2,
            executed_by_id=rouse.id
        )
        results.append(tr)

    # 6 Improvements
    imp_objs = []
    for i in range(39, 45):
        tc = tc_list[i]
        tr = TestResult(
            execution_id=exec1.id,
            test_case_id=tc.id,
            status=TestStatus.IMPROVEMENT,
            expected_result=tc.expected_result,
            actual_result=f"La función opera pero requiere optimización de usabilidad en {tc.code}.",
            severity=SeverityLevel.NONE,
            priority=TestPriority.P3,
            executed_by_id=rouse.id
        )
        results.append(tr)

    db.add_all(results)
    db.commit()

    # Link bugs & improvements
    for idx, tr in enumerate([r for r in results if r.status == TestStatus.BUG]):
        b = Bug(
            code=f"BUG-{idx+1:03d}",
            title=f"El proceso no se actualiza después de editar ({tr.test_case.code})" if idx == 0 else f"Defecto detectado en {tr.test_case.code}",
            description=tr.actual_result,
            project_id=gestadoc.id,
            module_id=tr.test_case.module_id,
            test_case_id=tr.test_case_id,
            test_result_id=tr.id,
            execution_id=exec1.id,
            steps_to_reproduce="1. Abrir formulario\n2. Modificar datos\n3. Observar que no se actualiza",
            severity=tr.severity,
            priority=tr.priority,
            status=BugStatus.OPEN if idx < 5 else BugStatus.IN_PROGRESS,
            assignee_id=admin.id,
            created_by_id=rouse.id
        )
        db.add(b)

    for idx, tr in enumerate([r for r in results if r.status == TestStatus.IMPROVEMENT]):
        m = Improvement(
            code=f"MEJ-{idx+1:03d}",
            title=f"Agregar filtro por responsable ({tr.test_case.code})" if idx == 0 else f"Mejora de interfaz en {tr.test_case.code}",
            description=tr.actual_result,
            project_id=gestadoc.id,
            module_id=tr.test_case.module_id,
            test_case_id=tr.test_case_id,
            test_result_id=tr.id,
            priority=tr.priority,
            status="PENDING",
            created_by_id=rouse.id
        )
        db.add(m)

    db.commit()
