import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { ExecutionDetail, ExecutionCaseItem, Project, UserStory, Execution } from '../types';
import { EvidenceDropzone, EvidenceDraft } from '../components/EvidenceDropzone';
import { useAuth } from '../context/AuthContext';

export const ExecuteTestPage: React.FC = () => {
  const { showToast } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const executionIdParam = searchParams.get('execution_id');
  const caseIdParam = searchParams.get('case_id');
  const storyIdParam = searchParams.get('story_id');
  const projectIdParam = searchParams.get('project_id');

  const [execution, setExecution] = useState<ExecutionDetail | null>(null);
  const [cases, setCases] = useState<ExecutionCaseItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Guided launcher state (when accessed without execution_id)
  const [isLauncherMode, setIsLauncherMode] = useState<boolean>(false);
  const [launcherProjects, setLauncherProjects] = useState<Project[]>([]);
  const [launcherStories, setLauncherStories] = useState<UserStory[]>([]);
  const [selectedLProjId, setSelectedLProjId] = useState<number | ''>('');
  const [selectedLStoryId, setSelectedLStoryId] = useState<number | ''>('');
  const [recentExecutions, setRecentExecutions] = useState<any[]>([]);
  const [startingLauncher, setStartingLauncher] = useState<boolean>(false);

  // Form state
  const [actualResult, setActualResult] = useState<string>('');
  const [status, setStatus] = useState<string>('PASSED');
  const [severity, setSeverity] = useState<string>('NONE');
  const [priority, setPriority] = useState<string>('P2');
  const [observations, setObservations] = useState<string>('');
  const [evidenceList, setEvidenceList] = useState<EvidenceDraft[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Modals & Navigation guard
  const [showUnsavedModal, setShowUnsavedModal] = useState<boolean>(false);
  const [pendingNavAction, setPendingNavAction] = useState<(() => void) | null>(null);
  const [showFinishModal, setShowFinishModal] = useState<boolean>(false);
  const [completionSummary, setCompletionSummary] = useState<any | null>(null);

  // Load Execution & Cases OR Launcher
  useEffect(() => {
    if (!executionIdParam) {
      setIsLauncherMode(true);
      loadLauncherData();
    } else {
      setIsLauncherMode(false);
      loadExecutionData(executionIdParam);
    }
  }, [executionIdParam]);

  const loadLauncherData = async () => {
    setLoading(true);
    try {
      const [projs, execs] = await Promise.all([
        api.get<Project[]>('/projects'),
        api.get<any[]>('/executions')
      ]);
      setLauncherProjects(projs);
      setRecentExecutions(execs.slice(0, 8));
      if (projs.length > 0) {
        setSelectedLProjId(projs[0].id);
        loadLauncherStories(projs[0].id);
      }
    } catch (err: any) {
      showToast('Error al cargar proyectos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLauncherStories = async (pId: number) => {
    try {
      const stories = await api.get<UserStory[]>(`/user-stories?project_id=${pId}`);
      setLauncherStories(stories);
      if (stories.length > 0) {
        setSelectedLStoryId(stories[0].id);
      } else {
        setSelectedLStoryId('');
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleLaunchFromStory = async () => {
    if (!selectedLProjId || !selectedLStoryId) {
      showToast('Selecciona un proyecto y una historia de usuario.');
      return;
    }
    const story = launcherStories.find(s => s.id === Number(selectedLStoryId));
    if (!story) return;

    if (!story.test_cases_count || story.test_cases_count === 0) {
      showToast('Esta Historia de Usuario no tiene casos de prueba.');
      navigate(`/projects/${selectedLProjId}/user-stories/${selectedLStoryId}`);
      return;
    }

    setStartingLauncher(true);
    try {
      const newExec = await api.post<Execution>('/executions', {
        project_id: selectedLProjId,
        name: `Ejecución ${story.code} · ${story.title.slice(0, 35)}`,
        version: 'v1.0.0',
        environment: 'QA',
        description: `Ejecución aislada para ${story.code}`,
        user_story_ids: [story.id]
      });
      setSearchParams({
        execution_id: String(newExec.id),
        project_id: String(selectedLProjId),
        story_id: String(story.id)
      });
    } catch (err: any) {
      showToast('Error al iniciar ejecución: ' + err.message);
    } finally {
      setStartingLauncher(false);
    }
  };

  const loadExecutionData = async (execId: string) => {
    try {
      setLoading(true);
      const execData = await api.get<ExecutionDetail>(`/executions/${execId}`);
      setExecution(execData);

      const casesData = await api.get<ExecutionCaseItem[]>(`/executions/${execId}/cases`);
      setCases(casesData);

      let initialIndex = 0;
      if (caseIdParam) {
        const foundIdx = casesData.findIndex(c => c.test_case_id === Number(caseIdParam));
        if (foundIdx !== -1) initialIndex = foundIdx;
      } else {
        const pendingIdx = casesData.findIndex(c => c.status === 'NOT_EXECUTED' || c.status === 'IN_PROGRESS');
        if (pendingIdx !== -1) initialIndex = pendingIdx;
      }
      setCurrentIndex(initialIndex);

      if (casesData.length > 0 && initialIndex < casesData.length) {
        loadCaseForm(casesData[initialIndex], Number(execId));
      }
    } catch (err: any) {
      showToast('Error al cargar datos de ejecución: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCaseForm = async (caseItem: ExecutionCaseItem, execId: number) => {
    try {
      const detail = await api.get<ExecutionCaseItem>(`/executions/${execId}/cases/${caseItem.test_case_id}`);
      setStatus(detail.status && detail.status !== 'NOT_EXECUTED' ? detail.status : 'PASSED');
      setActualResult(detail.actual_result || '');
      setSeverity(detail.severity || 'NONE');
      setPriority(detail.priority || 'P2');
      setObservations(detail.observations || '');
      setEvidenceList([]);
      setIsDirty(false);
    } catch (err: any) {
      showToast('Error al cargar detalles del caso: ' + err.message);
    }
  };

  const handleSelectCaseIndex = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= cases.length) return;

    if (isDirty) {
      setPendingNavAction(() => () => switchCase(newIndex));
      setShowUnsavedModal(true);
    } else {
      switchCase(newIndex);
    }
  };

  const switchCase = (newIndex: number) => {
    setCurrentIndex(newIndex);
    const targetCase = cases[newIndex];
    if (execution && targetCase) {
      const pId = projectIdParam || String(execution.project_id);
      const sId = storyIdParam || (execution.user_story_ids && execution.user_story_ids[0] ? String(execution.user_story_ids[0]) : '');
      const newParams: Record<string, string> = {
        execution_id: String(execution.id),
        case_id: String(targetCase.test_case_id)
      };
      if (pId) newParams.project_id = pId;
      if (sId) newParams.story_id = sId;
      setSearchParams(newParams);
      loadCaseForm(targetCase, execution.id);
    }
    setShowUnsavedModal(false);
    setPendingNavAction(null);
  };

  // Validation
  const validateForm = (): boolean => {
    if (status === 'BUG') {
      if (!actualResult.trim()) {
        showToast('El campo "Resultado obtenido" es obligatorio para registrar un BUG.');
        return false;
      }
      if (severity === 'NONE') {
        showToast('Debes seleccionar una Severidad válida (Crítica, Alta, Media, Baja) para un BUG.');
        return false;
      }
    } else if (status === 'BLOCKED') {
      if (!actualResult.trim()) {
        showToast('El campo "Resultado obtenido" es obligatorio para un caso BLOQUEADO.');
        return false;
      }
      if (!observations.trim()) {
        showToast('El campo "Observaciones" es obligatorio para explicar por qué la prueba está bloqueada.');
        return false;
      }
    }
    return true;
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!execution || cases.length === 0) return;
    const currentCase = cases[currentIndex];
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('test_case_id', String(currentCase.test_case_id));
      formData.append('actual_result', actualResult);
      formData.append('severity', severity);
      formData.append('priority', priority);
      formData.append('observations', observations);

      const descriptions = evidenceList.map(e => e.description);
      formData.append('descriptions', JSON.stringify(descriptions));

      evidenceList.forEach((ev) => {
        formData.append('files', ev.file);
      });

      await api.postFormData(`/executions/${execution.id}/draft`, formData);
      setIsDirty(false);
      showToast('Borrador guardado exitosamente (Estado: En progreso) ✓');

      const casesData = await api.get<ExecutionCaseItem[]>(`/executions/${execution.id}/cases`);
      setCases(casesData);
    } catch (err: any) {
      showToast('Error al guardar borrador: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Result
  const handleSaveResult = async () => {
    if (!execution || cases.length === 0) return;
    if (!validateForm()) return;

    const currentCase = cases[currentIndex];
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('test_case_id', String(currentCase.test_case_id));
      formData.append('status', status);
      formData.append('actual_result', actualResult);
      formData.append('severity', severity);
      formData.append('priority', priority);
      formData.append('observations', observations);

      const descriptions = evidenceList.map(e => e.description);
      formData.append('descriptions', JSON.stringify(descriptions));

      evidenceList.forEach((ev) => {
        formData.append('files', ev.file);
      });

      await api.postFormData(`/executions/${execution.id}/results`, formData);
      setIsDirty(false);
      showToast(`Resultado guardado como ${status} ✓`);

      const updatedExec = await api.get<ExecutionDetail>(`/executions/${execution.id}`);
      setExecution(updatedExec);

      const updatedCases = await api.get<ExecutionCaseItem[]>(`/executions/${execution.id}/cases`);
      setCases(updatedCases);

      // Advance to next pending case or show finish summary
      const nextPendingIndex = updatedCases.findIndex((c, idx) => idx > currentIndex && (c.status === 'NOT_EXECUTED' || c.status === 'IN_PROGRESS'));
      if (nextPendingIndex !== -1) {
        switchCase(nextPendingIndex);
      } else if (currentIndex < updatedCases.length - 1) {
        switchCase(currentIndex + 1);
      } else {
        // Last case reached! Trigger finish modal with stats
        triggerFinishSummary(updatedCases);
      }
    } catch (err: any) {
      showToast('Error al guardar resultado: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const triggerFinishSummary = (casesList: ExecutionCaseItem[]) => {
    const passed = casesList.filter(c => c.status === 'PASSED').length;
    const bugs = casesList.filter(c => c.status === 'BUG').length;
    const imps = casesList.filter(c => c.status === 'IMPROVEMENT').length;
    const blocked = casesList.filter(c => c.status === 'BLOCKED').length;
    const pending = casesList.filter(c => c.status === 'NOT_EXECUTED' || c.status === 'IN_PROGRESS').length;

    setCompletionSummary({
      total: casesList.length,
      passed,
      bugs,
      improvements: imps,
      blocked,
      pending
    });
    setShowFinishModal(true);
  };

  const handleFinishExecution = async () => {
    if (!execution) return;
    try {
      await api.post<any>(`/executions/${execution.id}/finish`, {});
      showToast('Ejecución finalizada formalmente ✓');
      triggerFinishSummary(cases);
    } catch (err: any) {
      showToast('Error al finalizar ejecución: ' + err.message);
    }
  };

  const handleRerunTests = async () => {
    if (!execution) return;
    try {
      const storyId = storyIdParam || (execution.user_story_ids && execution.user_story_ids[0]);
      const newExec = await api.post<Execution>('/executions', {
        project_id: execution.project_id,
        name: `Re-ejecución · ${execution.name.replace(/^Re-ejecución · /, '')}`,
        version: execution.version,
        environment: execution.environment,
        description: `Nueva corrida de pruebas basada en ejecución #${execution.id}`,
        user_story_ids: storyId ? [Number(storyId)] : execution.user_story_ids
      });
      setShowFinishModal(false);
      showToast('Nueva ejecución iniciada ✓');
      const pId = projectIdParam || String(execution.project_id);
      const sId = storyId ? String(storyId) : '';
      setSearchParams({
        execution_id: String(newExec.id),
        project_id: pId,
        story_id: sId
      });
    } catch (err: any) {
      showToast('Error al reiniciar ejecución: ' + err.message);
    }
  };

  const getTargetStoryUrl = () => {
    const pId = projectIdParam || (execution ? String(execution.project_id) : '');
    const sId = storyIdParam || (execution && execution.user_story_ids && execution.user_story_ids[0] ? String(execution.user_story_ids[0]) : '');
    if (pId && sId) {
      return `/projects/${pId}/user-stories/${sId}`;
    }
    if (sId) {
      return `/user-stories/${sId}`;
    }
    if (pId) {
      return `/projects/${pId}/user-stories`;
    }
    return '/projects';
  };

  // Guided Launcher View
  if (isLauncherMode) {
    return (
      <div style={{ padding: '36px', maxWidth: '1000px', margin: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '13px', color: '#0f766e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Runner de Pruebas
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#172033', margin: '6px 0 10px' }}>
            Espacio de Ejecución de Pruebas
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '600px', margin: 'auto' }}>
            Para mantener el aislamiento del ciclo QA, las pruebas se ejecutan de manera enfocada por Historia de Usuario. Selecciona el requerimiento a probar o continúa una ejecución previa.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Launch by Story */}
          <div style={{ background: 'white', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(15,23,42,0.04)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              Iniciar Nueva Corrida por Historia de Usuario
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>
              Garantiza que únicamente se ejecuten los casos asociados al requerimiento seleccionado.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                1. Selecciona el Proyecto
              </label>
              <select
                value={selectedLProjId}
                onChange={(e) => {
                  const pId = Number(e.target.value);
                  setSelectedLProjId(pId);
                  loadLauncherStories(pId);
                }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                {launcherProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                2. Selecciona la Historia de Usuario
              </label>
              <select
                value={selectedLStoryId}
                onChange={(e) => setSelectedLStoryId(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                disabled={launcherStories.length === 0}
              >
                {launcherStories.length === 0 ? (
                  <option value="">No hay historias registradas en este proyecto</option>
                ) : (
                  launcherStories.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code}: {s.title} ({s.test_cases_count || 0} casos)
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              onClick={handleLaunchFromStory}
              disabled={startingLauncher || !selectedLStoryId}
              style={{
                width: '100%',
                background: '#0f766e',
                color: 'white',
                border: 'none',
                borderRadius: '9px',
                padding: '12px 18px',
                fontSize: '14px',
                fontWeight: 800,
                cursor: (startingLauncher || !selectedLStoryId) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>▶</span>
              <span>{startingLauncher ? 'Iniciando runner...' : 'Iniciar Pruebas Enfocadas'}</span>
            </button>
          </div>

          {/* Active Executions */}
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(15,23,42,0.04)' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              Reanudar Ejecución Existente
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
              Ejecuciones previas registradas en el sistema.
            </p>

            {recentExecutions.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                No hay ejecuciones registradas.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto' }}>
                {recentExecutions.map(ex => (
                  <div
                    key={ex.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px',
                      background: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{ex.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {ex.project_name || 'Proyecto'} · {ex.version} ({ex.environment}) · {ex.total_cases} casos
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const sId = ex.user_story_ids && ex.user_story_ids[0] ? String(ex.user_story_ids[0]) : '';
                        setSearchParams({
                          execution_id: String(ex.id),
                          project_id: String(ex.project_id),
                          story_id: sId
                        });
                      }}
                      style={{
                        background: '#0f766e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Abrir →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        Cargando espacio de trabajo de ejecución...
      </div>
    );
  }

  if (!execution || cases.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: '#172033' }}>No hay casos en esta ejecución</h2>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Esta corrida no contiene casos de prueba asociados.</p>
        <button
          onClick={() => navigate(getTargetStoryUrl())}
          style={{ background: '#0f766e', color: 'white', border: 0, padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', marginTop: '16px', fontWeight: 700 }}
        >
          Volver a la Historia de Usuario
        </button>
      </div>
    );
  }

  const currentCase = cases[currentIndex];

  // Story information from execution
  const activeStoryCode = execution.user_story_codes && execution.user_story_codes.length > 0
    ? execution.user_story_codes.join(', ')
    : (storyIdParam ? `HU-${storyIdParam}` : 'HU');

  // Counters
  const completedCount = cases.filter(c => c.status !== 'NOT_EXECUTED' && c.status !== 'IN_PROGRESS').length;
  const progressPct = cases.length > 0 ? Math.round((completedCount / cases.length) * 100) : 0;
  const passedCount = cases.filter(c => c.status === 'PASSED').length;
  const bugCount = cases.filter(c => c.status === 'BUG').length;
  const mejCount = cases.filter(c => c.status === 'IMPROVEMENT').length;
  const bloqCount = cases.filter(c => c.status === 'BLOCKED').length;
  const pendCount = cases.length - completedCount;

  return (
    <div style={{ width: '100%', padding: '20px 24px 36px', boxSizing: 'border-box' }}>
      {/* Context Breadcrumbs: [Proyecto] / [Historia de Usuario] / [Ejecución] */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
        <Link to="/projects" style={{ color: '#0f766e', textDecoration: 'none', fontWeight: 600 }}>
          {execution.project_name || 'Proyecto'}
        </Link>
        <span>/</span>
        <Link to={getTargetStoryUrl()} style={{ color: '#0f766e', textDecoration: 'none', fontWeight: 600 }}>
          {activeStoryCode}
        </Link>
        <span>/</span>
        <span style={{ color: '#0f172a', fontWeight: 700 }}>
          {execution.name}
        </span>
      </div>

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Corrida Aislada #{execution.id} · {execution.version} ({execution.environment})
          </div>
          <h1 style={{ fontSize: '26px', margin: '4px 0', fontWeight: 800, color: '#172033' }}>
            {execution.name}
          </h1>
          <div style={{ color: '#64748b', fontSize: '14px' }}>
            Caso {currentIndex + 1} de {cases.length}: <b>{currentCase.code}</b> — {currentCase.title}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => handleSelectCaseIndex(currentIndex - 1)}
            disabled={currentIndex === 0}
            style={{
              background: 'white',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '9px 15px',
              fontSize: '13px',
              fontWeight: 650,
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: currentIndex === 0 ? 0.5 : 1
            }}
          >
            ← Anterior
          </button>
          <button
            onClick={() => handleSelectCaseIndex(currentIndex + 1)}
            disabled={currentIndex === cases.length - 1}
            style={{
              background: 'white',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '9px 15px',
              fontSize: '13px',
              fontWeight: 650,
              cursor: currentIndex === cases.length - 1 ? 'not-allowed' : 'pointer',
              opacity: currentIndex === cases.length - 1 ? 0.5 : 1
            }}
          >
            Siguiente →
          </button>
          <button
            onClick={() => triggerFinishSummary(cases)}
            style={{
              background: '#047857',
              color: 'white',
              border: 0,
              borderRadius: '8px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ✓ Finalizar ejecución
          </button>
        </div>
      </div>

      {/* Progress & Stat Cards */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
            Progreso de ejecución ({completedCount} de {cases.length} casos evaluados)
          </span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f766e' }}>
            {progressPct}%
          </span>
        </div>
        <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ width: `${progressPct}%`, height: '100%', background: '#0f766e', transition: 'width 0.3s ease' }} />
        </div>

        {/* Counter Pills */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
            Pass: {passedCount}
          </span>
          <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
            Bugs: {bugCount}
          </span>
          <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
            Mejoras: {mejCount}
          </span>
          <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
            Bloqueados: {bloqCount}
          </span>
          <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
            Pendientes: {pendCount}
          </span>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '22px', alignItems: 'start' }}>
        {/* Cases List Sidebar (Strictly within this execution) */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', maxHeight: '780px', overflowY: 'auto' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>
            Casos en esta Corrida ({cases.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {cases.map((c, idx) => {
              const isSelected = idx === currentIndex;
              let badgeColor = '#64748b';
              let badgeBg = '#f1f5f9';
              if (c.status === 'PASSED') { badgeColor = '#166534'; badgeBg = '#dcfce7'; }
              else if (c.status === 'BUG') { badgeColor = '#991b1b'; badgeBg = '#fee2e2'; }
              else if (c.status === 'IMPROVEMENT') { badgeColor = '#3730a3'; badgeBg = '#e0e7ff'; }
              else if (c.status === 'BLOCKED') { badgeColor = '#92400e'; badgeBg = '#fef3c7'; }

              return (
                <div
                  key={c.id || idx}
                  onClick={() => handleSelectCaseIndex(idx)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #0f766e' : '1px solid #e2e8f0',
                    background: isSelected ? '#f0fdfa' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '12px', color: '#0f172a' }}>{c.code}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.title}
                    </div>
                  </div>
                  <span style={{ background: badgeBg, color: badgeColor, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                    {c.status || 'PEND'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Evaluation Pane */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Case Detail Box */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '12px', marginRight: '8px' }}>
                  {currentCase.code}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Prioridad: <b>{currentCase.priority}</b></span>
              </div>
              <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                {currentCase.module_name || 'General'}
              </span>
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>
              {currentCase.title}
            </h2>

            {currentCase.preconditions && (
              <div style={{ marginBottom: '12px', fontSize: '13px' }}>
                <b style={{ color: '#334155' }}>Precondiciones: </b>
                <span style={{ color: '#64748b' }}>{currentCase.preconditions}</span>
              </div>
            )}

            {currentCase.steps && currentCase.steps.length > 0 && (
              <div style={{ marginBottom: '12px', fontSize: '13px' }}>
                <b style={{ color: '#334155' }}>Pasos a seguir:</b>
                <ol style={{ margin: '6px 0 0', paddingLeft: '20px', color: '#475569' }}>
                  {currentCase.steps.map((step, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9', fontSize: '13px' }}>
              <b style={{ color: '#0f766e' }}>Resultado esperado: </b>
              <span style={{ color: '#334155' }}>{currentCase.expected_result}</span>
            </div>
          </div>

          {/* Form Pane */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>
              Registro de Ejecución & Clasificación
            </h3>

            {/* Classification Buttons */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                CLASIFICACIÓN DEL RESULTADO *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {[
                  { id: 'PASSED', label: 'PASS', bg: '#dcfce7', text: '#166534', activeBorder: '#16a34a' },
                  { id: 'BUG', label: 'BUG', bg: '#fee2e2', text: '#991b1b', activeBorder: '#dc2626' },
                  { id: 'IMPROVEMENT', label: 'MEJORA', bg: '#e0e7ff', text: '#3730a3', activeBorder: '#4f46e5' },
                  { id: 'BLOCKED', label: 'BLOQUEADO', bg: '#fef3c7', text: '#92400e', activeBorder: '#d97706' }
                ].map(opt => {
                  const isOptActive = status === opt.id;
                  return (
                    <label
                      key={opt.id}
                      htmlFor={`status-radio-${opt.id}`}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: isOptActive ? `2px solid ${opt.activeBorder}` : '1px solid #cbd5e1',
                        background: isOptActive ? opt.bg : 'white',
                        color: isOptActive ? opt.text : '#334155',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <input
                        type="radio"
                        id={`status-radio-${opt.id}`}
                        name="execution-status"
                        value={opt.id}
                        checked={isOptActive}
                        onChange={() => { setStatus(opt.id); setIsDirty(true); }}
                        style={{ margin: 0 }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Severity / Priority row if BUG or IMPROVEMENT */}
            {(status === 'BUG' || status === 'IMPROVEMENT') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Severidad {status === 'BUG' && '*'}
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => { setSeverity(e.target.value); setIsDirty(true); }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="NONE">Seleccionar severidad...</option>
                    <option value="CRITICAL">Crítica</option>
                    <option value="HIGH">Alta</option>
                    <option value="MEDIUM">Media</option>
                    <option value="LOW">Baja</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Prioridad
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => { setPriority(e.target.value); setIsDirty(true); }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="P1">P1 - Inmediata</option>
                    <option value="P2">P2 - Alta</option>
                    <option value="P3">P3 - Media</option>
                    <option value="P4">P4 - Baja</option>
                  </select>
                </div>
              </div>
            )}

            {/* Actual Result Textarea */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Resultado obtenido {status === 'BUG' || status === 'BLOCKED' ? '*' : '(Opcional si es PASS)'}
              </label>
              <textarea
                rows={3}
                placeholder="Describe exactamente qué ocurrió al ejecutar los pasos..."
                value={actualResult}
                onChange={(e) => { setActualResult(e.target.value); setIsDirty(true); }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            {/* Observations */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Observaciones / Notas adicionales {status === 'BLOCKED' && '*'}
              </label>
              <textarea
                rows={2}
                placeholder="Detalles sobre el entorno, datos de prueba utilizados, causas de bloqueo..."
                value={observations}
                onChange={(e) => { setObservations(e.target.value); setIsDirty(true); }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            {/* Evidence Dropzone */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Evidencias (Imágenes, capturas o logs)
              </label>
              <EvidenceDropzone
                evidenceList={evidenceList}
                onChange={(newList) => { setEvidenceList(newList); setIsDirty(true); }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                style={{
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 650,
                  color: '#475569',
                  cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                Guardar borrador
              </button>
              <button
                type="button"
                onClick={handleSaveResult}
                disabled={isSaving}
                style={{
                  background: '#0f766e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 20px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {isSaving ? 'Guardando...' : 'Guardar resultado'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      {showUnsavedModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'grid', placeItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700 }}>Cambios sin guardar</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13px' }}>
              Tienes datos ingresados sin guardar en este caso. Si cambias de caso sin guardar, perderás los cambios actuales.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowUnsavedModal(false)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '13px' }}
              >
                Permanecer aquí
              </button>
              <button
                onClick={() => { if (pendingNavAction) pendingNavAction(); }}
                style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
              >
                Descartar y cambiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Summary Modal */}
      {showFinishModal && completionSummary && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'grid', placeItems: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ fontSize: '36px', marginBottom: '6px' }}>🏁</div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                Resumen de la Ejecución
              </h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                {execution.name} · {activeStoryCode}
              </p>
            </div>

            {/* Statistics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid #f1f5f9'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a' }}>{completionSummary.passed}</div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>PASSED</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626' }}>{completionSummary.bugs}</div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>BUGS</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#4f46e5' }}>{completionSummary.improvements}</div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>MEJORAS</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#d97706' }}>{completionSummary.blocked}</div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>BLOQUEADOS</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#64748b' }}>{completionSummary.pending}</div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>PENDIENTES</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{completionSummary.total}</div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>TOTAL CASOS</div>
              </div>
            </div>

            {/* Clear Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowFinishModal(false);
                  navigate(`/executions/${execution.id}`);
                }}
                style={{
                  background: '#0f766e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '11px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📊 Ver reporte completo de la ejecución
              </button>

              <button
                onClick={() => {
                  setShowFinishModal(false);
                  navigate(getTargetStoryUrl());
                }}
                style={{
                  background: '#f1f5f9',
                  color: '#1e293b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '11px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📖 Volver a la Historia de Usuario
              </button>

              <button
                onClick={handleRerunTests}
                style={{
                  background: 'white',
                  color: '#0f766e',
                  border: '1px solid #0f766e',
                  borderRadius: '8px',
                  padding: '11px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ⚡ Ejecutar pruebas nuevamente (Nueva corrida)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ExecuteTestPage;
