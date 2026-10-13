import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { UserStoryDetail, TestCase, Execution, PaginatedTestCases } from '../types';
import { useAuth } from '../context/AuthContext';
import { StoryExcelImportModal } from '../components/StoryExcelImportModal';
import { StoryAIGeneratorModal } from '../components/StoryAIGeneratorModal';

export const UserStoryDetailPage: React.FC = () => {
  const { id, projectId } = useParams<{ id: string; projectId?: string }>();
  const navigate = useNavigate();
  const { showToast } = useAuth();

  const [story, setStory] = useState<UserStoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Excel import modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // AI Generator modal
  const [isAIGeneratorModalOpen, setIsAIGeneratorModalOpen] = useState(false);

  // Pagination & Filtering state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [totalCasesCount, setTotalCasesCount] = useState<number>(0);
  const [pagedCases, setPagedCases] = useState<TestCase[]>([]);
  const [loadingCases, setLoadingCases] = useState<boolean>(false);

  // Case CRUD Modal state
  const [isViewCaseModalOpen, setIsViewCaseModalOpen] = useState(false);
  const [isEditCaseModalOpen, setIsEditCaseModalOpen] = useState(false);
  const [isDeleteCaseModalOpen, setIsDeleteCaseModalOpen] = useState(false);
  const [activeCase, setActiveCase] = useState<TestCase | null>(null);

  // Edit Case Form state
  const [editTitle, setEditTitle] = useState('');
  const [editPreconditions, setEditPreconditions] = useState('');
  const [editSteps, setEditSteps] = useState('');
  const [editExpectedResult, setEditExpectedResult] = useState('');
  const [editPriority, setEditPriority] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P2');
  const [updatingCase, setUpdatingCase] = useState(false);
  const [deletingCase, setDeletingCase] = useState(false);

  // Quick execution modal / state
  const [isExecModalOpen, setIsExecModalOpen] = useState(false);
  const [execName, setExecName] = useState('');
  const [execVersion, setExecVersion] = useState('v1.0.0');
  const [execEnv, setExecEnv] = useState('QA');
  const [execNotes, setExecNotes] = useState('');
  const [startingExec, setStartingExec] = useState(false);

  // Link unassigned cases modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [unassignedCases, setUnassignedCases] = useState<TestCase[]>([]);
  const [selectedCaseIdsToAssign, setSelectedCaseIdsToAssign] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Create new case modal
  const [isCreateCaseModalOpen, setIsCreateCaseModalOpen] = useState(false);
  const [newCaseCode, setNewCaseCode] = useState('');
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCasePreconditions, setNewCasePreconditions] = useState('');
  const [newCaseSteps, setNewCaseSteps] = useState<string[]>(['']);
  const [newCaseExpected, setNewCaseExpected] = useState('');
  const [newCasePriority, setNewCasePriority] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P2');
  const [savingCase, setSavingCase] = useState(false);

  useEffect(() => {
    if (id) {
      loadStoryDetail();
    }
  }, [id]);

  // Load paginated cases whenever storyId, page, pageSize, searchTerm, or priorityFilter changes
  useEffect(() => {
    if (id) {
      loadPagedCases();
    }
  }, [id, page, pageSize, searchTerm, priorityFilter]);

  const loadStoryDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<UserStoryDetail>(`/user-stories/${id}`);
      setStory(data);
      setExecName(`Ejecución ${data.code} · ${data.title.slice(0, 35)}`);
      setExecNotes(`Ciclo de pruebas funcional para la Historia de Usuario ${data.code}`);
      loadPagedCases();
    } catch (err: any) {
      setError(err.message || 'Error al cargar el detalle de la Historia de Usuario.');
    } finally {
      setLoading(false);
    }
  };

  const loadPagedCases = async () => {
    if (!id) return;
    setLoadingCases(true);
    try {
      let url = `/user-stories/${id}/test-cases?page=${page}&page_size=${pageSize}`;
      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }
      if (priorityFilter !== 'ALL') {
        url += `&priority=${priorityFilter}`;
      }
      const data = await api.get<PaginatedTestCases>(url);
      setPagedCases(data.items || []);
      setTotalCasesCount(typeof data.total === 'number' ? data.total : (data.items?.length || 0));
    } catch (err: any) {
      console.error('Error al cargar casos paginados desde endpoint dedicado:', err);
      // Resilient fallback: If story detail already has test_cases, filter and slice in-memory
      if (story && Array.isArray(story.test_cases)) {
        let filtered = story.test_cases;
        if (priorityFilter !== 'ALL') {
          filtered = filtered.filter(c => (c.priority || '').toUpperCase() === priorityFilter.toUpperCase());
        }
        if (searchTerm.trim()) {
          const s = searchTerm.trim().toLowerCase();
          filtered = filtered.filter(c =>
            (c.code || '').toLowerCase().includes(s) ||
            (c.title || '').toLowerCase().includes(s) ||
            (c.expected_result || '').toLowerCase().includes(s)
          );
        }
        setTotalCasesCount(filtered.length);
        const startIndex = (page - 1) * pageSize;
        setPagedCases(filtered.slice(startIndex, startIndex + pageSize));
      }
    } finally {
      setLoadingCases(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPage(1); // Reset to page 1 on search change
  };

  const handlePriorityFilterChange = (val: string) => {
    setPriorityFilter(val);
    setPage(1); // Reset to page 1 on filter change
  };

  const handlePageSizeChange = (val: number) => {
    setPageSize(val);
    setPage(1);
  };

  const refreshAll = () => {
    loadStoryDetail();
    loadPagedCases();
  };

  // CRUD Handlers
  const handleOpenViewModal = (tc: TestCase) => {
    setActiveCase(tc);
    setIsViewCaseModalOpen(true);
  };

  const handleOpenEditModal = (tc: TestCase) => {
    setActiveCase(tc);
    setEditTitle(tc.title || '');
    setEditPreconditions(tc.preconditions || '');
    setEditSteps(Array.isArray(tc.steps) ? tc.steps.join('\n') : '');
    setEditExpectedResult(tc.expected_result || '');
    setEditPriority(tc.priority || 'P2');
    setIsEditCaseModalOpen(true);
  };

  const handleSaveEditCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;
    setUpdatingCase(true);
    try {
      const stepsArr = editSteps.split('\n').map(s => s.trim()).filter(s => s.length > 0);
      await api.put(`/test-cases/${activeCase.id}`, {
        title: editTitle.trim(),
        preconditions: editPreconditions.trim(),
        steps: stepsArr,
        expected_result: editExpectedResult.trim(),
        priority: editPriority
      });
      showToast(`Caso ${activeCase.code} actualizado exitosamente ✓`);
      setIsEditCaseModalOpen(false);
      setActiveCase(null);
      loadPagedCases();
      loadStoryDetail();
    } catch (err: any) {
      showToast('Error al actualizar caso: ' + err.message);
    } finally {
      setUpdatingCase(false);
    }
  };

  const handleOpenDeleteModal = (tc: TestCase) => {
    setActiveCase(tc);
    setIsDeleteCaseModalOpen(true);
  };

  const handleConfirmPermanentDelete = async () => {
    if (!activeCase) return;
    setDeletingCase(true);
    try {
      const res: any = await api.delete(`/test-cases/${activeCase.id}`);
      showToast(res.message || `Caso ${activeCase.code} eliminado correctamente.`);
      setIsDeleteCaseModalOpen(false);
      setActiveCase(null);
      refreshAll();
    } catch (err: any) {
      showToast('Error al eliminar caso: ' + err.message);
    } finally {
      setDeletingCase(false);
    }
  };

  const handleConfirmUnlinkFromModal = async () => {
    if (!activeCase) return;
    setDeletingCase(true);
    try {
      await api.put(`/test-cases/${activeCase.id}`, { user_story_id: 0 });
      showToast(`Caso ${activeCase.code} desacoplado de la historia ✓`);
      setIsDeleteCaseModalOpen(false);
      setActiveCase(null);
      refreshAll();
    } catch (err: any) {
      showToast('Error al desacoplar caso: ' + err.message);
    } finally {
      setDeletingCase(false);
    }
  };

  const handleStartExecution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!story) return;

    if (!story.test_cases || story.test_cases.length === 0) {
      showToast('No se puede iniciar la ejecución sin casos de prueba asociados.');
      return;
    }

    setStartingExec(true);
    try {
      const payload = {
        project_id: story.project_id,
        name: execName.trim() || `Ejecución — ${story.code}`,
        version: execVersion.trim() || 'v1.0.0',
        environment: execEnv,
        description: execNotes.trim() || `Ejecución enfocada para ${story.code}: ${story.title}`,
        user_story_ids: [story.id]
      };

      const res = await api.post<Execution>('/executions', payload);
      showToast(`Ejecución creada exitosamente para ${story.code} ✓`);
      setIsExecModalOpen(false);

      // Navigate directly to the execution runner
      const pId = projectId || String(story.project_id);
      navigate(`/execute-test?execution_id=${res.id}&project_id=${pId}&story_id=${story.id}`);
    } catch (err: any) {
      showToast(`Error al iniciar ejecución: ${err.message}`);
    } finally {
      setStartingExec(false);
    }
  };

  const openAssignModal = async () => {
    if (!story) return;
    try {
      // Fetch unassigned cases strictly for this project
      const resp = await api.get<{ items: TestCase[] }>(`/test-cases?project_id=${story.project_id}&unassigned_story=true&page_size=100`);
      setUnassignedCases(resp.items || []);
      setSelectedCaseIdsToAssign([]);
      setIsAssignModalOpen(true);
    } catch (err: any) {
      showToast('Error al cargar casos disponibles: ' + err.message);
    }
  };

  const toggleCaseToAssign = (cid: number) => {
    if (selectedCaseIdsToAssign.includes(cid)) {
      setSelectedCaseIdsToAssign(selectedCaseIdsToAssign.filter(i => i !== cid));
    } else {
      setSelectedCaseIdsToAssign([...selectedCaseIdsToAssign, cid]);
    }
  };

  const handleCommitAssignCases = async () => {
    if (!story || selectedCaseIdsToAssign.length === 0) return;
    setAssigning(true);
    try {
      await api.post(`/user-stories/${story.id}/assign-cases`, {
        test_case_ids: selectedCaseIdsToAssign
      });
      showToast(`${selectedCaseIdsToAssign.length} casos vinculados a ${story.code} ✓`);
      setIsAssignModalOpen(false);
      loadStoryDetail();
    } catch (err: any) {
      showToast('Error al vincular casos: ' + err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleUnlinkCase = async (tc: TestCase) => {
    if (!window.confirm(`¿Desacoplar el caso ${tc.code} de esta historia? No se eliminarán sus datos ni ejecuciones.`)) {
      return;
    }
    try {
      await api.put(`/test-cases/${tc.id}`, { user_story_id: 0 });
      showToast(`Caso ${tc.code} desacoplado exitosamente.`);
      loadStoryDetail();
    } catch (err: any) {
      showToast('Error al desacoplar caso: ' + err.message);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!story) return;
    try {
      const blob = await api.getBlob(`/user-stories/${story.id}/import-cases/template`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plantilla_casos_${story.code}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Plantilla descargada correctamente ✓');
    } catch (err: any) {
      showToast('Error al descargar plantilla: ' + err.message);
    }
  };

  const openCreateCaseModal = () => {
    if (!story) return;
    const prefix = story.code.replace('HU-', 'TC-');
    const nextIdx = (story.test_cases?.length || 0) + 1;
    setNewCaseCode(`${prefix}-${String(nextIdx).padStart(2, '0')}`);
    setNewCaseTitle('');
    setNewCasePreconditions('');
    setNewCaseSteps(['']);
    setNewCaseExpected('');
    setNewCasePriority('P2');
    setIsCreateCaseModalOpen(true);
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!story) return;
    setSavingCase(true);
    try {
      const filteredSteps = newCaseSteps.map(s => s.trim()).filter(s => s.length > 0);
      await api.post('/test-cases', {
        project_id: story.project_id,
        module_id: story.module_id,
        code: newCaseCode.trim().toUpperCase(),
        title: newCaseTitle.trim(),
        preconditions: newCasePreconditions.trim(),
        steps: filteredSteps,
        expected_result: newCaseExpected.trim(),
        priority: newCasePriority,
        user_story_id: story.id
      });
      showToast(`Caso de prueba ${newCaseCode} creado para ${story.code} ✓`);
      setIsCreateCaseModalOpen(false);
      loadStoryDetail();
    } catch (err: any) {
      showToast('Error al crear caso: ' + err.message);
    } finally {
      setSavingCase(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'DONE' || s === 'ACCEPTED') {
      return <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>ACEPTADA</span>;
    }
    if (s === 'TESTING' || s === 'IN_PROGRESS') {
      return <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>EN PRUEBAS</span>;
    }
    return <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>POR HACER</span>;
  };

  const getResultBadge = (result?: string) => {
    if (!result) return <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>Sin ejecutar</span>;
    const r = result.toUpperCase();
    if (r === 'PASSED') return <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>PASSED</span>;
    if (r === 'BUG') return <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>BUG</span>;
    if (r === 'IMPROVEMENT') return <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>MEJORA</span>;
    if (r === 'BLOCKED') return <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>BLOQUEADO</span>;
    return <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>{result}</span>;
  };

  const getBackUrl = () => {
    if (projectId) {
      return `/projects/${projectId}/user-stories`;
    }
    if (story) {
      return `/projects/${story.project_id}/user-stories`;
    }
    return '/user-stories';
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        Cargando detalle de la Historia de Usuario...
      </div>
    );
  }

  if (error || !story) {
    return (
      <div style={{ padding: '40px', maxWidth: '800px', margin: 'auto' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '24px', borderRadius: '12px', color: '#991b1b' }}>
          <h3>Error</h3>
          <p>{error || 'Historia no encontrada'}</p>
          <button
            onClick={() => navigate(getBackUrl())}
            style={{ marginTop: '12px', background: '#0f766e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
          >
            ← Volver al listado
          </button>
        </div>
      </div>
    );
  }

  const caseCount = story.test_cases?.length || 0;

  return (
    <div className="story-detail-wrapper" style={{ width: '100%', padding: '20px 24px 36px', boxSizing: 'border-box' }}>
      <style>{`
        .story-detail-grid {
          display: grid;
          grid-template-columns: minmax(280px, 30%) minmax(0, 70%);
          gap: 14px;
          align-items: start;
          width: 100%;
        }
        .story-metrics-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin-bottom: 18px;
          width: 100%;
        }
        @media (max-width: 1100px) {
          .story-detail-grid {
            grid-template-columns: 1fr;
          }
          .story-metrics-grid {
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          }
        }
      `}</style>

      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
        <Link to="/projects" style={{ color: '#0f766e', textDecoration: 'none', fontWeight: 600 }}>
          Proyectos
        </Link>
        <span>›</span>
        <Link to={`/projects/${story.project_id}/user-stories`} style={{ color: '#0f766e', textDecoration: 'none', fontWeight: 600 }}>
          {story.project_name || 'Proyecto'}
        </Link>
        <span>›</span>
        <span style={{ color: '#0f172a', fontWeight: 700 }}>
          {story.code}
        </span>
      </div>

      {/* Header Banner */}
      <div style={{
        background: 'white',
        padding: '18px 22px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '16px',
        boxShadow: '0 2px 10px rgba(15,23,42,0.03)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              background: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              padding: '5px 12px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '15px'
            }}>
              {story.code}
            </span>
            {getStatusBadge(story.status)}
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Proyecto: <strong style={{ color: '#0f172a' }}>{story.project_name || 'GESTADOC'}</strong>
            </span>
            {story.module_name && (
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                • Módulo: <strong style={{ color: '#0f172a' }}>{story.module_name}</strong>
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            {story.title}
          </h1>
          <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
            {story.description || story.story_text}
          </p>
        </div>

        {/* Primary CTA: Iniciar pruebas · N casos */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <button
            onClick={() => setIsExecModalOpen(true)}
            disabled={caseCount === 0}
            style={{
              background: caseCount > 0 ? '#0f766e' : '#cbd5e1',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '11px 20px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: caseCount > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: caseCount > 0 ? '0 4px 12px rgba(15,118,110,0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '15px' }}>▶</span>
            <span>Iniciar pruebas · {caseCount} {caseCount === 1 ? 'caso' : 'casos'}</span>
          </button>
          {caseCount === 0 && (
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Asocia casos de prueba para iniciar el runner
            </span>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="story-metrics-grid">
        <div style={{ background: 'white', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', minWidth: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Casos</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{story.metrics.total_cases}</div>
        </div>
        <div style={{ background: 'white', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', minWidth: 0 }}>
          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, textTransform: 'uppercase' }}>Aprobados (Pass)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>{story.metrics.passed}</div>
        </div>
        <div style={{ background: 'white', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', minWidth: 0 }}>
          <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600, textTransform: 'uppercase' }}>Fallidos (Bugs)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>{story.metrics.failed}</div>
        </div>
        <div style={{ background: 'white', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', minWidth: 0 }}>
          <div style={{ fontSize: '12px', color: '#d97706', fontWeight: 600, textTransform: 'uppercase' }}>Bloqueados</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>{story.metrics.blocked}</div>
        </div>
        <div style={{ background: 'white', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', minWidth: 0 }}>
          <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 600, textTransform: 'uppercase' }}>Tasa de Éxito</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f766e', marginTop: '4px' }}>{story.metrics.pass_rate}%</div>
        </div>
      </div>

      <div className="story-detail-grid">
        {/* Left Column: Acceptance Criteria & Executions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '16px 18px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>
              Criterios de Aceptación
            </h3>
            {story.acceptance_criteria && story.acceptance_criteria.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {story.acceptance_criteria.map((crit, idx) => (
                  <li key={idx} style={{ fontSize: '13px', color: '#334155', lineHeight: '1.4' }}>
                    {crit}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>No hay criterios de aceptación definidos.</div>
            )}
          </div>

          {/* Execution History */}
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px' }}>
              Historial de Ejecuciones Aisladas
            </h3>
            {story.executions && story.executions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {story.executions.map(ex => (
                  <div
                    key={ex.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '14px',
                      background: '#f8fafc'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <b style={{ fontSize: '14px', color: '#0f172a' }}>{ex.name}</b>
                      <span style={{
                        background: ex.status === 'COMPLETADA' ? '#dcfce7' : '#fef3c7',
                        color: ex.status === 'COMPLETADA' ? '#15803d' : '#92400e',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        {ex.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                      {ex.version} · {ex.environment} · {ex.total_cases} casos ({ex.passed_count} Pass, {ex.bugs_count} Bugs)
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => navigate(`/execute-test?execution_id=${ex.id}&project_id=${story.project_id}&story_id=${story.id}`)}
                        style={{
                          background: '#0f766e',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Abrir Runner
                      </button>
                      <button
                        onClick={() => navigate(`/executions/${ex.id}`)}
                        style={{
                          background: 'white',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#334155',
                          cursor: 'pointer'
                        }}
                      >
                        Ver Detalle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                No se han registrado ejecuciones para esta historia todavía.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Associated Test Cases */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '16px 18px', minWidth: 0 }}>
          {/* Section Header & Actions Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>
                Casos de Prueba Asociados ({caseCount})
              </h2>
              <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
                Casos de prueba que validan esta historia funcionalmente.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={openCreateCaseModal}
                style={{
                  background: '#0f766e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                + Nuevo Caso
              </button>
              <button
                onClick={openAssignModal}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '7px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#0369a1',
                  cursor: 'pointer'
                }}
              >
                + Vincular Existente
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                data-testid="import-excel-header-btn"
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '7px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#0f766e',
                  cursor: 'pointer'
                }}
              >
                📥 Importar Excel
              </button>
              <button
                onClick={handleDownloadTemplate}
                data-testid="download-template-header-btn"
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '7px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                📄 Descargar Plantilla
              </button>
              <button
                onClick={() => setIsAIGeneratorModalOpen(true)}
                data-testid="ai-generate-header-btn"
                style={{
                  background: 'linear-gradient(135deg, #0f766e 0%, #0e7490 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '7px 13px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)'
                }}
              >
                ✦ Generar casos con IA
              </button>
            </div>
          </div>

          {/* Search, Filter & Page Size Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '8px 12px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                placeholder="Buscar por código, título o resultado..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{
                  flex: 1,
                  maxWidth: '340px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  background: 'white'
                }}
              />
              <select
                value={priorityFilter}
                onChange={(e) => handlePriorityFilterChange(e.target.value)}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  background: 'white',
                  color: '#334155'
                }}
              >
                <option value="ALL">Todas las prioridades</option>
                <option value="P1">P1 - Crítica</option>
                <option value="P2">P2 - Alta</option>
                <option value="P3">P3 - Media</option>
                <option value="P4">P4 - Baja</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
              <span>Por página:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                style={{
                  padding: '5px 8px',
                  fontSize: '12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  background: 'white',
                  fontWeight: 600
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {loadingCases ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              Cargando casos asociados...
            </div>
          ) : pagedCases.length > 0 ? (
            <div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '8px 10px', width: '90px' }}>Código</th>
                      <th style={{ padding: '8px 10px' }}>Caso de Prueba</th>
                      <th style={{ padding: '8px 10px', width: '70px', textAlign: 'center' }}>Prioridad</th>
                      <th style={{ padding: '8px 10px', width: '110px', textAlign: 'center' }}>Último Resultado</th>
                      <th style={{ padding: '8px 10px', width: '170px', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedCases.map(tc => (
                      <tr key={tc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontWeight: 800, color: '#0f172a' }}>{tc.code}</span>
                          {tc.is_ai_generated && (
                            <span style={{ marginLeft: '4px', fontSize: '9px', background: '#ecfeff', color: '#0f766e', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>
                              IA
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }} title={tc.title}>
                            {tc.title}
                          </div>
                          {tc.expected_result && (
                            <div style={{ color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }} title={tc.expected_result}>
                              {tc.expected_result}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <span style={{
                            background: tc.priority === 'P1' ? '#fee2e2' : tc.priority === 'P2' ? '#fef3c7' : '#f1f5f9',
                            color: tc.priority === 'P1' ? '#991b1b' : tc.priority === 'P2' ? '#92400e' : '#475569',
                            padding: '2px 6px',
                            borderRadius: '5px',
                            fontWeight: 700,
                            fontSize: '10px'
                          }}>
                            {tc.priority}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {getResultBadge(tc.last_result)}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                            <button
                              onClick={() => handleOpenViewModal(tc)}
                              title="Ver detalle completo"
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '5px',
                                color: '#0369a1',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 7px'
                              }}
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(tc)}
                              title="Editar caso"
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '5px',
                                color: '#0f766e',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 7px'
                              }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleOpenDeleteModal(tc)}
                              title="Eliminar o desacoplar caso"
                              style={{
                                background: '#fff5f5',
                                border: '1px solid #fecaca',
                                borderRadius: '5px',
                                color: '#dc2626',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 7px'
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Compact Pagination Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '12px',
                padding: '6px 4px',
                fontSize: '12px',
                color: '#64748b'
              }}>
                <div>
                  Mostrando {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalCasesCount)} de {totalCasesCount} casos
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page <= 1}
                    style={{
                      background: 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: page <= 1 ? 'not-allowed' : 'pointer',
                      opacity: page <= 1 ? 0.5 : 1,
                      color: '#334155'
                    }}
                  >
                    ← Anterior
                  </button>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    Página {page} de {Math.max(1, Math.ceil(totalCasesCount / pageSize))}
                  </span>
                  <button
                    onClick={() => setPage(prev => (prev < Math.ceil(totalCasesCount / pageSize) ? prev + 1 : prev))}
                    disabled={page >= Math.ceil(totalCasesCount / pageSize)}
                    style={{
                      background: 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: page >= Math.ceil(totalCasesCount / pageSize) ? 'not-allowed' : 'pointer',
                      opacity: page >= Math.ceil(totalCasesCount / pageSize) ? 0.5 : 1,
                      color: '#334155'
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '36px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>📋</div>
              <div style={{ fontWeight: 700, color: '#334155', marginBottom: '4px', fontSize: '14px' }}>
                {caseCount === 0 ? 'No hay casos de prueba asociados a esta historia' : 'No se encontraron casos con los filtros aplicados'}
              </div>
              <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 14px', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
                {caseCount === 0
                  ? 'Crea un caso nuevo, vincúlalos del proyecto, importa desde Excel o genéralos con IA.'
                  : 'Prueba modificando el término de búsqueda o cambiando el filtro de prioridad.'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={openCreateCaseModal}
                  style={{
                    background: '#0f766e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Crear Nuevo Caso
                </button>
                <button
                  onClick={openAssignModal}
                  style={{
                    background: 'white',
                    border: '1px solid #cbd5e1',
                    borderRadius: '7px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#0369a1',
                    cursor: 'pointer'
                  }}
                >
                  Vincular Existentes
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  data-testid="import-excel-empty-btn"
                  style={{
                    background: '#0f766e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  📥 Importar Excel
                </button>
                <button
                  onClick={handleDownloadTemplate}
                  data-testid="download-template-empty-btn"
                  style={{
                    background: 'white',
                    border: '1px solid #cbd5e1',
                    borderRadius: '7px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                >
                  📄 Descargar Plantilla
                </button>
                <button
                  onClick={() => setIsAIGeneratorModalOpen(true)}
                  style={{
                    background: 'linear-gradient(135deg, #0f766e 0%, #0e7490 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  ✦ Generar con IA
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Start Execution Confirmation Modal */}
      {isExecModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px' }}>⚡</span>
              <h2 style={{ fontSize: '19px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Iniciar Pruebas · {story.code}
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
              Se iniciará una ejecución aislada que incluye exactamente <b>{caseCount} casos de prueba</b> correspondientes a <i>{story.title}</i>.
            </p>

            <form onSubmit={handleStartExecution}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Nombre de la Ejecución *
                </label>
                <input
                  type="text"
                  value={execName}
                  onChange={(e) => setExecName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Versión / Build
                  </label>
                  <input
                    type="text"
                    value={execVersion}
                    onChange={(e) => setExecVersion(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Ambiente
                  </label>
                  <select
                    value={execEnv}
                    onChange={(e) => setExecEnv(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="QA">QA</option>
                    <option value="STAGING">STAGING</option>
                    <option value="DEV">DEV</option>
                    <option value="PROD">PRODUCCIÓN</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Notas / Observaciones
                </label>
                <textarea
                  rows={2}
                  value={execNotes}
                  onChange={(e) => setExecNotes(e.target.value)}
                  placeholder="Detalles sobre el alcance de esta corrida..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              {/* Ordered test cases preview */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Casos de prueba a ejecutar en orden ({caseCount})
                </label>
                <div style={{
                  maxHeight: '140px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  padding: '8px'
                }}>
                  {story.test_cases?.map((c, i) => (
                    <div key={c.id} style={{ fontSize: '12px', padding: '4px 6px', display: 'flex', justifyContent: 'space-between', borderBottom: i < caseCount - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{i + 1}. {c.code} — {c.title}</span>
                      <span style={{ color: '#64748b', fontWeight: 700, fontSize: '11px' }}>{c.priority}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsExecModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={startingExec}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0f766e',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: startingExec ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>▶</span>
                  <span>{startingExec ? 'Creando runner...' : 'Confirmar e Iniciar Pruebas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Unassigned Cases Modal */}
      {isAssignModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
                Vincular Casos a {story.code}
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Selecciona los casos de prueba sin historia asignada en el proyecto <b>{story.project_name}</b>.
              </p>
            </div>

            <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
              {unassignedCases.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  No hay casos sin historia en este proyecto.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {unassignedCases.map(c => {
                    const checked = selectedCaseIdsToAssign.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleCaseToAssign(c.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: checked ? '1px solid #0f766e' : '1px solid #e2e8f0',
                          background: checked ? '#f0fdfa' : 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{c.code}</span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{c.priority}</span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#334155' }}>{c.title}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCommitAssignCases}
                disabled={assigning || selectedCaseIdsToAssign.length === 0}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#0f766e',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: (assigning || selectedCaseIdsToAssign.length === 0) ? 'not-allowed' : 'pointer'
                }}
              >
                {assigning ? 'Vinculando...' : `Vincular (${selectedCaseIdsToAssign.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Test Case Modal */}
      {isCreateCaseModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
              Nuevo Caso de Prueba para {story.code}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 18px' }}>
              El caso quedará inmediatamente vinculado a esta Historia de Usuario.
            </p>

            <form onSubmit={handleCreateCase}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Código *</label>
                  <input
                    type="text"
                    value={newCaseCode}
                    onChange={(e) => setNewCaseCode(e.target.value.toUpperCase())}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Prioridad</label>
                  <select
                    value={newCasePriority}
                    onChange={(e) => setNewCasePriority(e.target.value as any)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="P1">P1 - Crítica</option>
                    <option value="P2">P2 - Alta</option>
                    <option value="P3">P3 - Media</option>
                    <option value="P4">P4 - Baja</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Título del Caso *</label>
                <input
                  type="text"
                  placeholder="Ej. Verificar ingreso exitoso con credenciales válidas"
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Precondiciones</label>
                <textarea
                  rows={2}
                  placeholder="Ej. Usuario activo registrado en el sistema..."
                  value={newCasePreconditions}
                  onChange={(e) => setNewCasePreconditions(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Resultado Esperado *</label>
                <textarea
                  rows={2}
                  placeholder="Ej. El usuario es redirigido al dashboard con su sesión iniciada."
                  value={newCaseExpected}
                  onChange={(e) => setNewCaseExpected(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateCaseModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCase}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#0f766e', color: 'white', fontSize: '13px', fontWeight: 700, cursor: savingCase ? 'not-allowed' : 'pointer' }}
                >
                  {savingCase ? 'Guardando...' : 'Crear Caso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {story && (
        <StoryExcelImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          storyId={story.id}
          storyCode={story.code}
          storyTitle={story.title}
          projectId={story.project_id}
          onSuccess={refreshAll}
        />
      )}

      {story && (
        <StoryAIGeneratorModal
          isOpen={isAIGeneratorModalOpen}
          onClose={() => setIsAIGeneratorModalOpen(false)}
          storyId={story.id}
          storyCode={story.code}
          storyTitle={story.title}
          storyDescription={story.description || story.story_text}
          acceptanceCriteria={story.acceptance_criteria || []}
          businessRules={story.business_rules}
          projectId={story.project_id}
          onSuccess={refreshAll}
        />
      )}

      {/* View Test Case Detail Modal */}
      {isViewCaseModalOpen && activeCase && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '26px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{activeCase.code}</span>
                  <span style={{
                    background: activeCase.priority === 'P1' ? '#fee2e2' : activeCase.priority === 'P2' ? '#fef3c7' : '#f1f5f9',
                    color: activeCase.priority === 'P1' ? '#991b1b' : activeCase.priority === 'P2' ? '#92400e' : '#475569',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '11px'
                  }}>
                    {activeCase.priority}
                  </span>
                  {activeCase.is_ai_generated && (
                    <span style={{ background: '#ecfeff', color: '#0f766e', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                      Generado con IA
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>{activeCase.title}</h2>
              </div>
              <button
                onClick={() => { setIsViewCaseModalOpen(false); setActiveCase(null); }}
                style={{ background: 'none', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 700 }}>HISTORIA DE USUARIO</span>
                  <strong style={{ color: '#0f172a' }}>{story.code} · {story.title}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 700 }}>ÚLTIMO RESULTADO</span>
                  <div style={{ marginTop: '2px' }}>{getResultBadge(activeCase.last_result)}</div>
                </div>
              </div>

              {activeCase.preconditions && (
                <div>
                  <b style={{ color: '#334155', display: 'block', marginBottom: '4px' }}>Precondiciones:</b>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', color: '#475569', border: '1px solid #e2e8f0' }}>
                    {activeCase.preconditions}
                  </div>
                </div>
              )}

              {activeCase.steps && activeCase.steps.length > 0 && (
                <div>
                  <b style={{ color: '#334155', display: 'block', marginBottom: '4px' }}>Pasos de Reproducción:</b>
                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <ol style={{ margin: 0, paddingLeft: '18px', color: '#334155' }}>
                      {activeCase.steps.map((s, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{s}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              <div>
                <b style={{ color: '#334155', display: 'block', marginBottom: '4px' }}>Resultado Esperado:</b>
                <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '6px', color: '#166534', border: '1px solid #bbf7d0', fontWeight: 500 }}>
                  {activeCase.expected_result}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsViewCaseModalOpen(false);
                  handleOpenEditModal(activeCase);
                }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#0f766e', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Editar Caso
              </button>
              <button
                type="button"
                onClick={() => { setIsViewCaseModalOpen(false); setActiveCase(null); }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#0f766e', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Test Case Modal */}
      {isEditCaseModalOpen && activeCase && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '620px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '26px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
              Editar Caso {activeCase.code}
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px' }}>
              Modifica la definición del caso. Los resultados históricos y evidencias no se alterarán.
            </p>

            <form onSubmit={handleSaveEditCase}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Código</label>
                  <input
                    type="text"
                    value={activeCase.code}
                    disabled
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#f1f5f9', color: '#64748b' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Prioridad *</label>
                  <select
                    value={editPriority}
                    onChange={(e: any) => setEditPriority(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: 'white' }}
                  >
                    <option value="P1">P1 - Crítica</option>
                    <option value="P2">P2 - Alta</option>
                    <option value="P3">P3 - Media</option>
                    <option value="P4">P4 - Baja</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Título del Caso *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Precondiciones</label>
                <textarea
                  rows={2}
                  value={editPreconditions}
                  onChange={(e) => setEditPreconditions(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Pasos (uno por línea)</label>
                <textarea
                  rows={4}
                  value={editSteps}
                  onChange={(e) => setEditSteps(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Resultado Esperado *</label>
                <textarea
                  rows={2}
                  value={editExpectedResult}
                  onChange={(e) => setEditExpectedResult(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setIsEditCaseModalOpen(false); setActiveCase(null); }}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updatingCase}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#0f766e', color: 'white', fontSize: '12px', fontWeight: 700, cursor: updatingCase ? 'not-allowed' : 'pointer' }}
                >
                  {updatingCase ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Unlink Confirmation Modal */}
      {isDeleteCaseModalOpen && activeCase && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#991b1b' }}>
                Gestionar Caso {activeCase.code}
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 8px', lineHeight: 1.4 }}>
              <b>{activeCase.title}</b>
            </p>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px', lineHeight: 1.4 }}>
              Puedes <b>desacoplar el caso</b> de esta Historia de Usuario (manteniéndolo en el catálogo general del proyecto y preservando sus resultados históricos) o <b>eliminarlo definitivamente</b> del sistema (si tiene ejecuciones pasadas, el sistema lo archivará protegiendo la trazabilidad).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                disabled={deletingCase}
                onClick={handleConfirmUnlinkFromModal}
                style={{
                  padding: '9px 14px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f766e',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: deletingCase ? 'not-allowed' : 'pointer',
                  textAlign: 'left'
                }}
              >
                1. Desacoplar de {story.code} (Recomendado)
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 400, color: '#64748b' }}>
                  El caso se desvincula de esta historia pero permanece disponible en el proyecto.
                </span>
              </button>

              <button
                type="button"
                disabled={deletingCase}
                onClick={handleConfirmPermanentDelete}
                style={{
                  padding: '9px 14px',
                  borderRadius: '7px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#991b1b',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: deletingCase ? 'not-allowed' : 'pointer',
                  textAlign: 'left'
                }}
              >
                2. Eliminar definitivamente del sistema
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 400, color: '#991b1b' }}>
                  Se elimina del catálogo global o se archiva si ya tiene ejecuciones registradas.
                </span>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => { setIsDeleteCaseModalOpen(false); setActiveCase(null); }}
                style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default UserStoryDetailPage;
