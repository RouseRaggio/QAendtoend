import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Execution, Project, TestCase, UserStory } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ExecutionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal create execution state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formProjectId, setFormProjectId] = useState<number>(1);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEnvironment, setFormEnvironment] = useState<'QA' | 'STAGING' | 'PROD' | 'DEV'>('QA');
  const [formVersion, setFormVersion] = useState('v1.0.0');
  const [executionScopeMode, setExecutionScopeMode] = useState<'USER_STORIES' | 'ALL_CASES'>('USER_STORIES');

  // Scope: User Stories
  const [availableStories, setAvailableStories] = useState<UserStory[]>([]);
  const [selectedStoryIds, setSelectedStoryIds] = useState<number[]>([]);

  // Scope: Test Cases
  const [availableCases, setAvailableCases] = useState<TestCase[]>([]);
  const [selectedCaseIds, setSelectedCaseIds] = useState<number[]>([]);
  const [caseSearch, setCaseSearch] = useState('');
  const [caseModuleFilter, setCaseModuleFilter] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Finish and Delete confirmation modals
  const [finishModalExec, setFinishModalExec] = useState<Execution | null>(null);
  const [deleteModalExec, setDeleteModalExec] = useState<Execution | null>(null);

  const loadExecutions = async () => {
    try {
      const res = await api.get<Execution[]>('/executions');
      setExecutions(res);
    } catch (err: any) {
      showToast('Error al cargar ejecuciones: ' + err.message);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await api.get<Project[]>('/projects');
      setProjects(res);
      if (res.length > 0 && !formProjectId) {
        setFormProjectId(res[0].id);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadProjectData = async (projId: number) => {
    try {
      const [casesRes, storiesRes] = await Promise.all([
        api.get<any>(`/test-cases?project_id=${projId}&page_size=300`),
        api.get<UserStory[]>(`/user-stories?project_id=${projId}`)
      ]);
      const items = casesRes.items || casesRes || [];
      const stories = storiesRes || [];
      setAvailableCases(items);
      setAvailableStories(stories);

      // By default in USER_STORIES mode: select all stories and their cases
      const allStoryIds = stories.map(s => s.id);
      setSelectedStoryIds(allStoryIds);
      const matchingCaseIds = items.filter((c: any) => c.user_story_id && allStoryIds.includes(c.user_story_id)).map((c: any) => c.id);
      // If no story cases found (e.g. all unassigned), fallback to selecting all cases
      setSelectedCaseIds(matchingCaseIds.length > 0 ? matchingCaseIds : items.map((c: any) => c.id));
    } catch (err: any) {
      showToast('Error al cargar datos del proyecto: ' + err.message);
    }
  };

  useEffect(() => {
    loadExecutions();
    loadProjects();
  }, []);

  const openCreateModal = () => {
    setFormName('');
    setFormDescription('');
    setFormEnvironment('QA');
    setFormVersion('v1.0.0');
    setExecutionScopeMode('USER_STORIES');
    const pId = projects.length > 0 ? projects[0].id : 1;
    setFormProjectId(pId);
    loadProjectData(pId);
    setIsCreateModalOpen(true);
  };

  const toggleStorySelect = (storyId: number) => {
    const nextStoryIds = selectedStoryIds.includes(storyId)
      ? selectedStoryIds.filter(id => id !== storyId)
      : [...selectedStoryIds, storyId];
    setSelectedStoryIds(nextStoryIds);

    if (nextStoryIds.length === 0) {
      setSelectedCaseIds([]);
    } else {
      const matchingCaseIds = availableCases
        .filter(c => c.user_story_id && nextStoryIds.includes(c.user_story_id))
        .map(c => c.id);
      setSelectedCaseIds(matchingCaseIds);
    }
  };

  const handleSelectAllStories = () => {
    const allStoryIds = availableStories.map(s => s.id);
    setSelectedStoryIds(allStoryIds);
    const matchingCaseIds = availableCases
      .filter(c => c.user_story_id && allStoryIds.includes(c.user_story_id))
      .map(c => c.id);
    setSelectedCaseIds(matchingCaseIds);
  };

  const handleDeselectAllStories = () => {
    setSelectedStoryIds([]);
    setSelectedCaseIds([]);
  };

  const handleSelectAllCases = () => {
    setSelectedCaseIds(availableCases.map(c => c.id));
  };

  const handleDeselectAllCases = () => {
    setSelectedCaseIds([]);
  };

  const toggleCaseSelect = (caseId: number) => {
    setSelectedCaseIds(prev =>
      prev.includes(caseId) ? prev.filter(id => id !== caseId) : [...prev, caseId]
    );
  };

  const handleCreateExecution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('El nombre de la ejecución es obligatorio');
      return;
    }
    if (selectedCaseIds.length === 0) {
      showToast('Debes seleccionar al menos un caso de prueba para ejecutar');
      return;
    }

    setIsSubmitting(true);
    try {
      const newExec = await api.post<Execution>('/executions', {
        project_id: formProjectId,
        name: formName.trim(),
        description: formDescription.trim(),
        environment: formEnvironment,
        version: formVersion.trim() || 'v1.0.0',
        user_story_ids: executionScopeMode === 'USER_STORIES' && selectedStoryIds.length > 0 ? selectedStoryIds : undefined,
        test_case_ids: selectedCaseIds
      });
      showToast('Ejecución iniciada exitosamente ✓');
      setIsCreateModalOpen(false);
      navigate(`/execute-test?execution_id=${newExec.id}&index=0`);
    } catch (err: any) {
      showToast('Error al crear ejecución: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmFinish = async () => {
    if (!finishModalExec) return;
    try {
      await api.post(`/executions/${finishModalExec.id}/finish`, {});
      showToast('Ejecución finalizada ✓');
      setFinishModalExec(null);
      loadExecutions();
    } catch (err: any) {
      showToast('Error al finalizar: ' + err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalExec) return;
    try {
      await api.delete(`/executions/${deleteModalExec.id}`);
      showToast('Ejecución eliminada ✓');
      setDeleteModalExec(null);
      loadExecutions();
    } catch (err: any) {
      showToast('Error al eliminar: ' + err.message);
    }
  };

  const filtered = executions.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.project_name && e.project_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesProject = selectedProjectId === 'ALL' || e.project_id === selectedProjectId;
    const matchesStatus = selectedStatus === 'ALL' || e.status === selectedStatus;
    return matchesSearch && matchesProject && matchesStatus;
  });

  const filteredCasesForSelection = availableCases.filter(c => {
    const matchesCodeOrTitle = c.code.toLowerCase().includes(caseSearch.toLowerCase()) ||
      c.title.toLowerCase().includes(caseSearch.toLowerCase());
    const matchesMod = caseModuleFilter === 'ALL' || (c.module_name || '').toLowerCase() === caseModuleFilter.toLowerCase();
    return matchesCodeOrTitle && matchesMod;
  });

  const modulesInSelection = Array.from(new Set(availableCases.map(c => c.module_name).filter(Boolean)));

  return (
    <div style={{ width: '100%', padding: '20px 24px 36px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Gestión de pruebas
          </div>
          <h1 style={{ fontSize: '27px', margin: '5px 0', fontWeight: 800, color: '#172033' }}>
            Ejecuciones
          </h1>
          <div style={{ color: '#718096', fontSize: '14px' }}>
            Organiza y controla las ejecuciones funcionales por versión.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={openCreateModal}
            style={{
              background: '#14b8a6',
              color: 'white',
              border: 0,
              borderRadius: '8px',
              padding: '10px 18px',
              fontWeight: 650,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ＋ Nueva ejecución
          </button>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '20px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
          <input
            placeholder="🔎 Buscar ejecución..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '9px 12px', border: '1px solid #e6eaf0', borderRadius: '8px', outline: 'none', fontSize: '13px', minWidth: '240px' }}
          />
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            style={{ padding: '9px 12px', border: '1px solid #e6eaf0', borderRadius: '8px', outline: 'none', fontSize: '13px' }}
          >
            <option value="ALL">Todos los proyectos</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            style={{ padding: '9px 12px', border: '1px solid #e6eaf0', borderRadius: '8px', outline: 'none', fontSize: '13px' }}
          >
            <option value="ALL">Todos los estados</option>
            <option value="EN_EJECUCION">En ejecución</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="FINALIZADA">Finalizada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e6eaf0', textAlign: 'left', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                <th style={{ padding: '12px' }}>Ejecución</th>
                <th style={{ padding: '12px' }}>Proyecto</th>
                <th style={{ padding: '12px' }}>Ambiente</th>
                <th style={{ padding: '12px' }}>Versión</th>
                <th style={{ padding: '12px' }}>Tester</th>
                <th style={{ padding: '12px' }}>Fecha</th>
                <th style={{ padding: '12px', minWidth: '140px' }}>Progreso</th>
                <th style={{ padding: '12px' }}>Resultados</th>
                <th style={{ padding: '12px' }}>Estado</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    No se encontraron ejecuciones registradas.
                  </td>
                </tr>
              ) : (
                filtered.map(e => {
                  const pct = e.progress_percentage || 0;
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid #e6eaf0' }}>
                      <td style={{ padding: '12px' }}>
                        <b style={{ color: '#0f172a', cursor: 'pointer' }} onClick={() => navigate(`/executions/${e.id}`)}>
                          {e.name}
                        </b>
                        {e.user_story_codes && e.user_story_codes.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {e.user_story_codes.map(code => (
                              <span
                                key={code}
                                style={{
                                  background: '#ecfeff',
                                  color: '#0f766e',
                                  border: '1px solid #a5f3fc',
                                  borderRadius: '4px',
                                  padding: '1px 6px',
                                  fontSize: '10px',
                                  fontWeight: 700
                                }}
                              >
                                📖 {code}
                              </span>
                            ))}
                          </div>
                        )}
                        {e.description && (
                          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: '#475569' }}>{e.project_name || 'GESTADOC'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: '#f1f5f9', color: '#334155', padding: '3px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                          {e.environment}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#475569', fontWeight: 600 }}>{e.version}</td>
                      <td style={{ padding: '12px', color: '#475569' }}>{e.responsible_name || 'QA Tester'}</td>
                      <td style={{ padding: '12px', color: '#718096', fontSize: '12px' }}>
                        {new Date(e.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, background: '#f1f5f9', height: '7px', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, background: '#14b8a6', height: '100%', transition: 'width .3s' }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155', minWidth: '42px' }}>
                            {e.executed_count} / {e.total_cases}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          <span title="Pasó" style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                            {e.passed_count} OK
                          </span>
                          <span title="Bugs" style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                            {e.bugs_count} Bugs
                          </span>
                          {e.improvements_count > 0 && (
                            <span title="Mejoras" style={{ background: '#fef3c7', color: '#a16207', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                              {e.improvements_count} Mej
                            </span>
                          )}
                          {e.blocked_count > 0 && (
                            <span title="Bloqueados" style={{ background: '#ede9fe', color: '#6d28d9', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                              {e.blocked_count} Bloq
                            </span>
                          )}
                          {e.pending_count > 0 && (
                            <span title="Pendientes" style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                              {e.pending_count} Pend
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          background: e.status === 'FINALIZADA' ? '#dcfce7' : e.status === 'CANCELADA' ? '#fee2e2' : '#fef3c7',
                          color: e.status === 'FINALIZADA' ? '#15803d' : e.status === 'CANCELADA' ? '#b91c1c' : '#a16207',
                          padding: '4px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 750
                        }}>
                          {e.status === 'FINALIZADA' ? 'Finalizada' : e.status === 'CANCELADA' ? 'Cancelada' : 'En ejecución'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => navigate(`/executions/${e.id}`)}
                            title="Ver detalle"
                            style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            👁 Ver
                          </button>
                          {e.status !== 'FINALIZADA' && e.status !== 'CANCELADA' && (
                            <button
                              onClick={() => navigate(`/execute-test?execution_id=${e.id}`)}
                              title="Continuar ejecución"
                              style={{ background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                            >
                              ▶ Continuar
                            </button>
                          )}
                          {e.status !== 'FINALIZADA' && (
                            <button
                              onClick={() => setFinishModalExec(e)}
                              title="Finalizar ejecución"
                              style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                            >
                              ✓ Finalizar
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteModalExec(e)}
                            title="Eliminar ejecución"
                            style={{ background: '#ffe4e6', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Nueva Ejecución */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '780px', maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '26px', boxShadow: '0 20px 40px rgba(0,0,0,.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#172033' }}>
                  Iniciar Nueva Ejecución de Pruebas
                </h2>
                <div style={{ color: '#64748b', fontSize: '13px', marginTop: '3px' }}>
                  Define el alcance, ambiente y selecciona los casos de prueba que serán ejecutados.
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 0, fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExecution} style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Proyecto *
                  </label>
                  <select
                    value={formProjectId}
                    onChange={e => {
                      const id = Number(e.target.value);
                      setFormProjectId(id);
                      loadProjectData(id);
                    }}
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 12px', fontSize: '13px' }}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Nombre de la ejecución *
                  </label>
                  <input
                    placeholder="Ej. Regresión Workflow - Sprint 24"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    required
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Ambiente *
                  </label>
                  <select
                    value={formEnvironment}
                    onChange={e => setFormEnvironment(e.target.value as any)}
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 12px', fontSize: '13px' }}
                  >
                    <option value="QA">QA</option>
                    <option value="STAGING">STAGING</option>
                    <option value="PROD">PROD</option>
                    <option value="DEV">DEV</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Versión / Build *
                  </label>
                  <input
                    placeholder="Ej. v2.4.0"
                    value={formVersion}
                    onChange={e => setFormVersion(e.target.value)}
                    required
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Descripción (opcional)
                </label>
                <textarea
                  placeholder="Objetivo de la ejecución, alcance y consideraciones..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', minHeight: '60px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Selector de modo de alcance */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 750, marginBottom: '8px', color: '#334155' }}>
                  Alcance de la ejecución
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setExecutionScopeMode('USER_STORIES');
                      // Auto-select cases belonging to selected stories
                      const matchingCaseIds = availableCases
                        .filter(c => c.user_story_id && selectedStoryIds.includes(c.user_story_id))
                        .map(c => c.id);
                      setSelectedCaseIds(matchingCaseIds.length > 0 ? matchingCaseIds : availableCases.map(c => c.id));
                    }}
                    style={{
                      flex: 1,
                      padding: '9px 14px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: executionScopeMode === 'USER_STORIES' ? '#0f766e' : '#cbd5e1',
                      background: executionScopeMode === 'USER_STORIES' ? '#f0fdfa' : 'white',
                      color: executionScopeMode === 'USER_STORIES' ? '#0f766e' : '#64748b',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    📖 Por Historias de Usuario ({selectedStoryIds.length} seleccionadas)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExecutionScopeMode('ALL_CASES');
                      setSelectedCaseIds(availableCases.map(c => c.id));
                    }}
                    style={{
                      flex: 1,
                      padding: '9px 14px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: executionScopeMode === 'ALL_CASES' ? '#0f766e' : '#cbd5e1',
                      background: executionScopeMode === 'ALL_CASES' ? '#f0fdfa' : 'white',
                      color: executionScopeMode === 'ALL_CASES' ? '#0f766e' : '#64748b',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    📋 Todos los casos / Selección libre ({availableCases.length} totales)
                  </button>
                </div>
              </div>

              {/* Si es por Historias de Usuario */}
              {executionScopeMode === 'USER_STORIES' && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', background: '#f8fafc', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 750, fontSize: '13px', color: '#172033' }}>
                        Seleccionar Historias de Usuario ({selectedStoryIds.length} de {availableStories.length})
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Se incluirán los casos de prueba asociados a las historias seleccionadas.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={handleSelectAllStories}
                        style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Todas
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllStories}
                        style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Ninguna
                      </button>
                    </div>
                  </div>

                  <div style={{ maxHeight: '180px', overflowY: 'auto', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                    {availableStories.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                        No hay historias de usuario registradas en este proyecto.
                      </div>
                    ) : (
                      availableStories.map(story => {
                        const isSelected = selectedStoryIds.includes(story.id);
                        const storyCasesCount = availableCases.filter(c => c.user_story_id === story.id).length;
                        return (
                          <label
                            key={story.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 12px',
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              background: isSelected ? '#f0fdfa' : 'white',
                              fontSize: '12px'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleStorySelect(story.id)}
                              style={{ cursor: 'pointer' }}
                            />
                            <span style={{ fontWeight: 750, color: '#0f766e', minWidth: '70px' }}>{story.code}</span>
                            <span style={{ flex: 1, color: '#334155', fontWeight: 600 }}>{story.title}</span>
                            {story.module_name && (
                              <span style={{ color: '#64748b', fontSize: '10px', background: '#f1f5f9', padding: '2px 5px', borderRadius: '4px' }}>
                                {story.module_name}
                              </span>
                            )}
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: storyCasesCount > 0 ? '#0f766e' : '#94a3b8',
                              background: storyCasesCount > 0 ? '#ecfeff' : '#f1f5f9',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              {storyCasesCount} caso(s)
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Selector de casos de prueba */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 750, fontSize: '14px', color: '#172033' }}>
                      Casos de prueba a ejecutar ({selectedCaseIds.length} seleccionados)
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Se ejecutará la suite respetando estrictamente el orden establecido.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleSelectAllCases}
                      style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllCases}
                      style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Deseleccionar todos
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input
                    placeholder="🔎 Filtrar casos por código o nombre..."
                    value={caseSearch}
                    onChange={e => setCaseSearch(e.target.value)}
                    style={{ flex: 1, padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <select
                    value={caseModuleFilter}
                    onChange={e => setCaseModuleFilter(e.target.value)}
                    style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                  >
                    <option value="ALL">Todos los módulos</option>
                    {modulesInSelection.map((m: any) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div style={{ maxHeight: '220px', overflowY: 'auto', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                  {filteredCasesForSelection.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      No se encontraron casos de prueba en este proyecto.
                    </div>
                  ) : (
                    filteredCasesForSelection.map(c => {
                      const isSelected = selectedCaseIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '9px 12px',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            background: isSelected ? '#f0fdfa' : 'white',
                            fontSize: '13px'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCaseSelect(c.id)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontWeight: 700, color: '#0f766e', minWidth: '85px' }}>{c.code}</span>
                          <span style={{ flex: 1, color: '#334155' }}>{c.title}</span>
                          {c.user_story_code && (
                            <span style={{ color: '#0f766e', fontSize: '11px', background: '#ecfeff', padding: '2px 6px', borderRadius: '4px', fontWeight: 650 }}>
                              📖 {c.user_story_code}
                            </span>
                          )}
                          {c.module_name && (
                            <span style={{ color: '#64748b', fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                              {c.module_name}
                            </span>
                          )}
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: c.priority === 'P1' ? '#fee2e2' : c.priority === 'P2' ? '#fef3c7' : '#f1f5f9',
                            color: c.priority === 'P1' ? '#b91c1c' : c.priority === 'P2' ? '#b45309' : '#475569'
                          }}>
                            {c.priority}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedCaseIds.length === 0}
                  style={{
                    background: '#14b8a6',
                    color: 'white',
                    border: 0,
                    borderRadius: '8px',
                    padding: '10px 22px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: selectedCaseIds.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: selectedCaseIds.length === 0 ? 0.6 : 1
                  }}
                >
                  {isSubmitting ? 'Iniciando...' : `⚡ Iniciar ejecución (${selectedCaseIds.length} casos)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Finalizar Ejecución */}
      {finishModalExec && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '480px', maxWidth: '100%', padding: '26px', boxShadow: '0 20px 40px rgba(0,0,0,.2)' }}>
            <h2 style={{ margin: '0 0 10px', fontSize: '19px', fontWeight: 800, color: '#172033' }}>
              Finalizar Ejecución
            </h2>
            <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 16px', lineHeight: 1.5 }}>
              ¿Estás seguro de finalizar la ejecución <b>{finishModalExec.name}</b>?
            </p>

            {finishModalExec.pending_count > 0 ? (
              <div style={{ background: '#fef3c7', border: '1px solid #fde047', borderRadius: '8px', padding: '12px 14px', marginBottom: '18px', fontSize: '13px', color: '#92400e' }}>
                ⚠️ <b>Atención:</b> Esta ejecución tiene <b>{finishModalExec.pending_count}</b> casos pendientes de los {finishModalExec.total_cases} totales.
              </div>
            ) : (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px 14px', marginBottom: '18px', fontSize: '13px', color: '#065f46' }}>
                ✓ Todos los casos de prueba de esta ejecución han sido completados.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setFinishModalExec(null)}
                style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmFinish}
                style={{ background: '#15803d', color: 'white', border: 0, borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Confirmar y finalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Eliminar Ejecución */}
      {deleteModalExec && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '480px', maxWidth: '100%', padding: '26px', boxShadow: '0 20px 40px rgba(0,0,0,.2)' }}>
            <h2 style={{ margin: '0 0 10px', fontSize: '19px', fontWeight: 800, color: '#be123c' }}>
              Eliminar Ejecución
            </h2>
            <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 16px', lineHeight: 1.5 }}>
              ¿Deseas eliminar permanentemente la ejecución <b>{deleteModalExec.name}</b>? Se borrarán sus resultados y archivos de evidencia asociados.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setDeleteModalExec(null)}
                style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{ background: '#be123c', color: 'white', border: 0, borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
