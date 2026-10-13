from typing import List
from app.ai.base import AIProvider
from app.schemas.schemas import AIAnalysisResult, AIGeneratedCase, GeneratedCaseType, TestPriority

class MockAIProvider(AIProvider):
    async def analyze_user_story(
        self,
        story_text: str,
        acceptance_criteria: List[str],
        business_rules: str = ""
    ) -> AIAnalysisResult:
        return AIAnalysisResult(
            requirements=[
                "Capacidad de crear y editar flujos de trabajo/procesos",
                "Validación de campos obligatorios (nombre del proceso)",
                "Confirmación explícita al usuario tras operaciones exitosas"
            ],
            business_rules=[
                "Nombres de procesos deben ser únicos por organización",
                "Solo usuarios con rol Administrador tienen permiso de edición"
            ],
            roles=["Administrador", "Auditor"],
            risks=[
                "Pérdida de datos si la sesión expira durante la edición",
                "Inconsistencia en catálogo tras guardado concurrente"
            ],
            ambiguities=[
                "Formato permitido para el archivo BPMN si se adjunta XML",
                "Comportamiento ante cancelación sin guardar cambios"
            ]
        )

    async def generate_test_cases(
        self,
        title: str,
        story_text: str,
        acceptance_criteria: List[str],
        analysis: AIAnalysisResult,
        test_types: List[str],
        detail_level: str = "HIGH"
    ) -> List[AIGeneratedCase]:
        cases = []
        
        # 1. POSITIVE
        cases.append(AIGeneratedCase(
            temp_code="CP-IA-001",
            title="Crear proceso con datos válidos",
            test_type=GeneratedCaseType.POSITIVE,
            priority=TestPriority.P1,
            preconditions="Usuario autenticado con rol Administrador",
            steps=[
                "Ingresar al módulo de Procesos.",
                "Hacer clic en 'Nuevo proceso'.",
                "Completar todos los campos obligatorios con datos válidos.",
                "Presionar 'Guardar'."
            ],
            expected_result="El proceso se crea correctamente y aparece en el catálogo con estado Activo.",
            traceability=["Criterio de Aceptación #1", "Criterio de Aceptación #5"]
        ))
        
        # 2. NEGATIVE
        cases.append(AIGeneratedCase(
            temp_code="CP-IA-002",
            title="Crear proceso sin nombre obligatorio",
            test_type=GeneratedCaseType.NEGATIVE,
            priority=TestPriority.P1,
            preconditions="Usuario autenticado con rol Administrador",
            steps=[
                "Abrir el formulario de nuevo proceso.",
                "Dejar el campo 'Nombre del proceso' vacío.",
                "Completar los demás campos secundarios.",
                "Intentar presionar 'Guardar'."
            ],
            expected_result="El sistema impide el guardado y resalta el campo obligatorio con un mensaje de validación.",
            traceability=["Criterio de Aceptación #2", "Criterio de Aceptación #3"]
        ))
        
        # 3. POSITIVE (Edit)
        cases.append(AIGeneratedCase(
            temp_code="CP-IA-003",
            title="Editar proceso existente",
            test_type=GeneratedCaseType.POSITIVE,
            priority=TestPriority.P2,
            preconditions="Proceso previamente creado y registrado en catálogo",
            steps=[
                "Seleccionar un proceso existente del catálogo.",
                "Hacer clic en 'Editar'.",
                "Modificar el nombre y descripción del proceso.",
                "Presionar 'Guardar cambios'."
            ],
            expected_result="Los cambios se guardan exitosamente y se visualizan actualizados en el catálogo de procesos.",
            traceability=["Criterio de Aceptación #4", "Criterio de Aceptación #5"]
        ))
        
        # 4. VALIDATION
        cases.append(AIGeneratedCase(
            temp_code="CP-IA-004",
            title="Cancelar creación sin guardar",
            test_type=GeneratedCaseType.VALIDATION,
            priority=TestPriority.P3,
            preconditions="Formulario de creación abierto con datos diligenciados",
            steps=[
                "Ingresar datos en los campos del formulario.",
                "Presionar el botón 'Cancelar'.",
                "Confirmar si aparece modal de confirmación de salida."
            ],
            expected_result="El formulario se cierra sin crear registros y los cambios se descartan de forma segura.",
            traceability=["Criterio de Aceptación #1"]
        ))
        
        # 5. BOUNDARY
        cases.append(AIGeneratedCase(
            temp_code="CP-IA-005",
            title="Datos en límite de longitud de caracteres",
            test_type=GeneratedCaseType.BOUNDARY,
            priority=TestPriority.P2,
            preconditions="Formulario de proceso en pantalla",
            steps=[
                "Ingresar un nombre de exactamente 255 caracteres en el campo Nombre.",
                "Intentar ingresar 256 caracteres o pegar una cadena mayor.",
                "Presionar 'Guardar'."
            ],
            expected_result="El sistema acepta la longitud permitida y trunca o rechaza valores que excedan el límite con aviso claro.",
            traceability=["Criterio de Aceptación #3"]
        ))
        
        # 6. SECURITY
        cases.append(AIGeneratedCase(
            temp_code="CP-IA-006",
            title="Usuario sin permisos de administración",
            test_type=GeneratedCaseType.SECURITY,
            priority=TestPriority.P1,
            preconditions="Usuario autenticado con rol Lector / Visualizador",
            steps=[
                "Intentar acceder a la ruta de creación de procesos o presionar el botón 'Nuevo proceso'.",
                "Comprobar visibilidad y comportamiento del botón."
            ],
            expected_result="El botón se muestra deshabilitado o no visible, y una llamada directa por API retorna HTTP 403 Forbidden.",
            traceability=["Regla de Negocio: Permisos por Rol"]
        ))
        
        return cases
