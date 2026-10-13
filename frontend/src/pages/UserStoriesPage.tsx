import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { UserStory, Project, Module } from '../types';
import { useAuth } from '../context/AuthContext';

export const UserStoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId?: string }>();
  const { showToast } = useAuth();

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [stories, setStories] = useState<UserStory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>(projectId ? Number(projectId) : '');
  const [selectedModuleId, setSelectedModuleId] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [execStatusFilter, setExecStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<UserStory | null>(null);
  const [formProjectId, setFormProjectId] = useState<number>(projectId ? Number(projectId) : 1);
  const [formModuleId, setFormModuleId] = useState<number | ''>('');
  const [formCode, setFormCode] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formStatus, setFormStatus] = useState<string>('TODO');
  const [formCriteria, setFormCriteria] = useState<string[]>(['']);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Jira Import Modal State
  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false);
  const [jiraStatus, setJiraStatus] = useState<{ configured: boolean; connected: boolean; message: string } | null>(null);
  const [jiraIssueKey, setJiraIssueKey] = useState('');
  const [jiraProjectId, setJiraProjectId] = useState<number>(projectId ? Number(projectId) : 1);
  const [jiraLoading, setJiraLoading] = useState(false);
  const [jiraError, setJiraError] = useState<string | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingStory, setDeletingStory] = useState<UserStory | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    loadProjects();
  }, [projectId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProjectId, selectedModuleId, statusFilter, execStatusFilter, searchTerm]);

  useEffect(() => {
    if (selectedProjectId !== '') {
      loadModules(Number(selectedProjectId));
      loadStories();
    }
  }, [selectedProjectId, selectedModuleId, statusFilter, execStatusFilter]);

  const loadProjects = async () => {
    try {
      const data = await api.get<Project[]>('/projects');
      setProjects(data);

      if (projectId) {
        const found = data.find(p => p.id === Number(projectId));
        if (found) {
          setCurrentProject(found);
          setSelectedProjectId(found.id);
          setFormProjectId(found.id);
          setJiraProjectId(found.id);
        }
      } else if (data.length > 0 && selectedProjectId === '') {
        setSelectedProjectId(data[0].id);
        setFormProjectId(data[0].id);
        setJiraProjectId(data[0].id);
      }
    } catch (err) {
      console.error('Error al cargar proyectos:', err);
    }
  };

  const loadModules = async (projId: number) => {
    try {
      const data = await api.get<Module[]>(`/projects/${projId}/modules`);
      setModules(data);
    } catch (err) {
      console.error('Error al cargar módulos:', err);
    }
  };

  const loadStories = async () => {
    setLoading(true);
    try {
      const pId = projectId ? Number(projectId) : selectedProjectId;
      let url = '/user-stories?';
      const params = new URLSearchParams();
      if (pId !== '') params.append('project_id', String(pId));
      if (selectedModuleId !== '') params.append('module_id', String(selectedModuleId));
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const data = await api.get<UserStory[]>(url + params.toString());
      
      // Filter by execution status locally if selected
      let filtered = data;
      if (execStatusFilter) {
        if (execStatusFilter === 'UNTESTED') {
          filtered = data.filter(s => !s.latest_execution_status);
        } else if (execStatusFilter === 'EN_EJECUCION') {
          filtered = data.filter(s => s.latest_execution_status === 'EN_EJECUCION');
        } else if (execStatusFilter === 'COMPLETADA') {
          filtered = data.filter(s => s.latest_execution_status === 'COMPLETADA');
        }
      }

      setStories(filtered);
    } catch (err) {
      console.error('Error al cargar historias:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadStories();
  };

  const openCreateModal = () => {
    setEditingStory(null);
    const pId = projectId ? Number(projectId) : (selectedProjectId !== '' ? Number(selectedProjectId) : (projects[0]?.id || 1));
    setFormProjectId(pId);
    setFormModuleId('');
    setFormCode('');
    setFormTitle('');
    setFormDescription('');
    setFormStatus('TODO');
    setFormCriteria(['']);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (story: UserStory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStory(story);
    setFormProjectId(story.project_id);
    setFormModuleId(story.module_id || '');
    setFormCode(story.code);
    setFormTitle(story.title);
    setFormDescription(story.description || story.story_text || '');
    setFormStatus(story.status || 'TODO');
    setFormCriteria(story.acceptance_criteria && story.acceptance_criteria.length > 0 ? [...story.acceptance_criteria] : ['']);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAddCriteria = () => {
    setFormCriteria([...formCriteria, '']);
  };

  const handleRemoveCriteria = (index: number) => {
    setFormCriteria(formCriteria.filter((_, i) => i !== index));
  };

  const handleCriteriaChange = (index: number, val: string) => {
    const updated = [...formCriteria];
    updated[index] = val;
    setFormCriteria(updated);
  };

  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('El título es requerido.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const filteredCriteria = formCriteria.map(c => c.trim()).filter(c => c.length > 0);

    const payload = {
      project_id: formProjectId,
      module_id: formModuleId !== '' ? Number(formModuleId) : null,
      code: formCode.trim() ? formCode.trim().toUpperCase() : undefined,
      title: formTitle.trim(),
      description: formDescription.trim(),
      status: formStatus,
      acceptance_criteria: filteredCriteria
    };

    try {
      if (editingStory) {
        await api.put(`/user-stories/${editingStory.id}`, payload);
        showToast('Historia de usuario actualizada exitosamente ✓');
      } else {
        await api.post('/user-stories', payload);
        showToast('Historia de usuario creada exitosamente ✓');
      }
      setIsModalOpen(false);
      loadStories();
    } catch (err: any) {
      try {
        const parsed = JSON.parse(err.message);
        setFormError(parsed.detail || 'Error al guardar la historia.');
      } catch {
        setFormError(err.message || 'Error al guardar la historia.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Jira Import Handlers
  const openJiraModal = async () => {
    setJiraIssueKey('');
    setJiraError(null);
    setJiraLoading(true);
    setIsJiraModalOpen(true);
    try {
      const statusRes = await api.get<{ configured: boolean; connected: boolean; message: string }>('/jira/status');
      setJiraStatus(statusRes);
    } catch (err: any) {
      setJiraStatus({ configured: false, connected: false, message: err.message });
    } finally {
      setJiraLoading(false);
    }
  };

  const handleImportJira = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jiraIssueKey.trim()) {
      setJiraError('Ingrese la clave del issue de Jira (ej. PROJ-123)');
      return;
    }
    setJiraLoading(true);
    setJiraError(null);
    try {
      await api.post('/jira/import-story', {
        project_id: jiraProjectId,
        issue_key: jiraIssueKey.trim().toUpperCase()
      });
      showToast(`Historia importada exitosamente desde Jira (${jiraIssueKey.trim().toUpperCase()}) ✓`);
      setIsJiraModalOpen(false);
      loadStories();
    } catch (err: any) {
      try {
        const parsed = JSON.parse(err.message);
        setJiraError(parsed.detail || err.message);
      } catch {
        setJiraError(err.message);
      }
    } finally {
      setJiraLoading(false);
    }
  };

  const getStoryDetailUrl = (storyId: number) => {
    if (projectId) {
      return `/projects/${projectId}/user-stories/${storyId}`;
    }
    return `/user-stories/${storyId}`;
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

  const getExecutionStatusBadge = (execStatus?: string) => {
    if (!execStatus) {
      return <span style={{ background: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>Sin ejecutar</span>;
    }
    const es = execStatus.toUpperCase();
    if (es === 'COMPLETADA' || es === 'PASSED') {
      return <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 750 }}>✓ Completada</span>;
    }
    if (es === 'EN_EJECUCION' || es === 'IN_PROGRESS') {
      return <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 750 }}>⚡ En ejecución</span>;
    }
    return <span style={{ background: '#e2e8f0', color: '#334155', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>{execStatus}</span>;
  };

  const openDeleteModal = (story: UserStory, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingStory(story);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleteLoading) return;
    setIsDeleteModalOpen(false);
    setDeletingStory(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingStory) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await api.delete<{ message: string; detached_cases_count?: number }>(`/user-stories/${deletingStory.id}`);
      showToast(res.message || `Historia ${deletingStory.code} eliminada exitosamente ✓`);
      setIsDeleteModalOpen(false);
      setDeletingStory(null);
      await loadStories();
    } catch (err: any) {
      let msg = 'Error al eliminar la historia de usuario.';
      try {
        const parsed = JSON.parse(err.message);
        msg = parsed.detail || msg;
      } catch {
        msg = err.message || msg;
      }
      setDeleteError(msg);
      showToast(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Pagination calculations
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(stories.length / pageSize));
  const currentSafePage = Math.min(currentPage, totalPages);
  const paginatedStories = pageSize === 0
    ? stories
    : stories.slice((currentSafePage - 1) * pageSize, currentSafePage * pageSize);
  const startIndex = stories.length === 0 ? 0 : (currentSafePage - 1) * pageSize + 1;
  const endIndex = pageSize === 0 ? stories.length : Math.min(stories.length, currentSafePage * pageSize);

  // Metrics summary
  const totalCount = stories.length;
  const withCasesCount = stories.filter(s => (s.test_cases_count || 0) > 0).length;
  const inProgressCount = stories.filter(s => s.latest_execution_status === 'EN_EJECUCION').length;
  const completedExecCount = stories.filter(s => s.latest_execution_status === 'COMPLETADA').length;

  return (
    <div style={{ width: '100%', padding: '20px 24px 36px', boxSizing: 'border-box' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
        <Link to="/projects" style={{ color: '#0f766e', textDecoration: 'none', fontWeight: 600 }}>
          Proyectos
        </Link>
        <span>›</span>
        <span style={{ color: '#0f172a', fontWeight: 700 }}>
          {currentProject ? currentProject.name : 'Historias de Usuario'}
        </span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {currentProject ? `Proyecto: ${currentProject.name} (${currentProject.key})` : 'Trazabilidad de Requerimientos'}
          </div>
          <h1 style={{ fontSize: '27px', margin: '4px 0', fontWeight: 800, color: '#172033' }}>
            Historias de Usuario
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Requerimientos organizados por proyecto. Cada historia ejecuta sus casos de prueba en un ciclo aislado de QA.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={openJiraModal}
            style={{
              background: '#f8fafc',
              color: '#0369a1',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🔗</span> Importar desde Jira
          </button>
          <button
            onClick={openCreateModal}
            style={{
              background: '#0f766e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(15,118,110,0.2)'
            }}
          >
            <span>+</span> Nueva Historia
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '22px' }}>
        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Historias</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{totalCount}</div>
        </div>
        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 600, textTransform: 'uppercase' }}>Con Casos QA</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f766e', marginTop: '4px' }}>{withCasesCount}</div>
        </div>
        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', color: '#d97706', fontWeight: 600, textTransform: 'uppercase' }}>En Ejecución Activa</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>{inProgressCount}</div>
        </div>
        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, textTransform: 'uppercase' }}>Ejecución Completada</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>{completedExecCount}</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        background: 'white',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* Project Selector (only visible if not locked by route) */}
        {!projectId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Proyecto:</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : '')}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                color: '#1e293b',
                background: '#fff'
              }}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
              ))}
            </select>
          </div>
        )}

        {/* Module Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Módulo:</label>
          <select
            value={selectedModuleId}
            onChange={(e) => setSelectedModuleId(e.target.value ? Number(e.target.value) : '')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              color: '#1e293b',
              background: '#fff'
            }}
          >
            <option value="">Todos los módulos</option>
            {modules.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Story Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Estado:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              color: '#1e293b',
              background: '#fff'
            }}
          >
            <option value="">Todos los estados</option>
            <option value="TODO">Por Hacer (TODO)</option>
            <option value="IN_PROGRESS">En Progreso</option>
            <option value="TESTING">En Pruebas</option>
            <option value="ACCEPTED">Aceptada / Done</option>
          </select>
        </div>

        {/* Execution Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Pruebas:</label>
          <select
            value={execStatusFilter}
            onChange={(e) => setExecStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              color: '#1e293b',
              background: '#fff'
            }}
          >
            <option value="">Todos los estados de prueba</option>
            <option value="EN_EJECUCION">En ejecución</option>
            <option value="COMPLETADA">Completada</option>
            <option value="UNTESTED">Sin ejecutar</option>
          </select>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px', marginLeft: 'auto', flex: '1', minWidth: '220px', maxWidth: '360px' }}>
          <input
            type="text"
            placeholder="Buscar HU, título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px'
            }}
          />
          <button
            type="submit"
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 650,
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Stories Table */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando historias de usuario...</div>
        ) : stories.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📖</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>No se encontraron Historias de Usuario</h3>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px' }}>Crea tu primera historia o importa requerimientos desde Jira.</p>
            <button
              onClick={openCreateModal}
              style={{
                background: '#0f766e',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              + Crear Historia
            </button>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '14px 18px', width: '110px' }}>Código</th>
                <th style={{ padding: '14px 18px' }}>Título / Historia</th>
                <th style={{ padding: '14px 18px', width: '150px' }}>Módulo</th>
                <th style={{ padding: '14px 18px', width: '110px', textAlign: 'center' }}>Casos QA</th>
                <th style={{ padding: '14px 18px', width: '140px', textAlign: 'center' }}>Última Ejecución</th>
                <th style={{ padding: '14px 18px', width: '120px' }}>Estado HU</th>
                <th style={{ padding: '14px 18px', width: '310px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStories.map(s => (
                <tr
                  key={s.id}
                  onClick={() => navigate(getStoryDetailUrl(s.id))}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{
                      background: '#f0fdf4',
                      color: '#166534',
                      border: '1px solid #bbf7d0',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontWeight: 800,
                      fontSize: '12px'
                    }}>
                      {s.code}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>{s.title}</div>
                    <div style={{ color: '#64748b', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '420px' }}>
                      {s.description || s.story_text}
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#475569' }}>
                    {s.module_name ? (
                      <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '5px', fontSize: '12px' }}>
                        {s.module_name}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>General</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <span style={{
                      background: (s.test_cases_count || 0) > 0 ? '#ccfbf1' : '#f1f5f9',
                      color: (s.test_cases_count || 0) > 0 ? '#0f766e' : '#94a3b8',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '12px'
                    }}>
                      {s.test_cases_count || 0} casos
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    {getExecutionStatusBadge(s.latest_execution_status)}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {getStatusBadge(s.status)}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        title="Abrir y gestionar Historia de Usuario"
                        aria-label={`Abrir HU ${s.code}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(getStoryDetailUrl(s.id));
                        }}
                        style={{
                          background: '#0f766e',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'white',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Abrir HU
                      </button>
                      <button
                        type="button"
                        title="Ver detalle completo de la Historia de Usuario"
                        aria-label={`Ver detalle ${s.code}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(getStoryDetailUrl(s.id));
                        }}
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 650,
                          color: '#166534',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        title="Editar historia de usuario"
                        aria-label={`Editar ${s.code}`}
                        onClick={(e) => openEditModal(s, e)}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#334155',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        title="Eliminar historia de usuario"
                        aria-label={`Eliminar ${s.code}`}
                        onClick={(e) => openDeleteModal(s, e)}
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 650,
                          color: '#b91c1c',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap'
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

          {/* Compact Pagination Footer */}
          {stories.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 18px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              fontSize: '13px',
              color: '#475569',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Mostrar:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    background: 'white',
                    color: '#1e293b'
                  }}
                >
                  <option value={10}>10 por página</option>
                  <option value={20}>20 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={0}>Todas ({stories.length})</option>
                </select>
                <span style={{ color: '#64748b' }}>
                  Mostrando <strong>{startIndex}</strong> - <strong>{endIndex}</strong> de <strong>{stories.length}</strong> historias
                </span>
              </div>

              {pageSize > 0 && totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={currentSafePage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: currentSafePage <= 1 ? '#f1f5f9' : 'white',
                      color: currentSafePage <= 1 ? '#94a3b8' : '#1e293b',
                      cursor: currentSafePage <= 1 ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: '12px'
                    }}
                  >
                    ← Anterior
                  </button>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>
                    Página {currentSafePage} de {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentSafePage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: currentSafePage >= totalPages ? '#f1f5f9' : 'white',
                      color: currentSafePage >= totalPages ? '#94a3b8' : '#1e293b',
                      cursor: currentSafePage >= totalPages ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: '12px'
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
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
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
              {editingStory ? `Editar Historia: ${editingStory.code}` : 'Nueva Historia de Usuario'}
            </h2>

            {formError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveStory}>
              {!projectId && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Proyecto *</label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(Number(e.target.value))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    disabled={!!editingStory}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Código HU {editingStory ? '*' : '(Opcional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. HU-001 (Auto si vacío)"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', textTransform: 'uppercase' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Módulo</label>
                  <select
                    value={formModuleId}
                    onChange={(e) => setFormModuleId(e.target.value ? Number(e.target.value) : '')}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="">General / Sin módulo</option>
                    {modules.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Título de la Historia *</label>
                <input
                  type="text"
                  placeholder="Ej. Autenticación de usuario con MFA"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Descripción / Narrativa (Como... quiero... para...)
                </label>
                <textarea
                  rows={3}
                  placeholder="Como usuario final, deseo ingresar mis credenciales y recibir código SMS..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Criterios de Aceptación</label>
                  <button
                    type="button"
                    onClick={handleAddCriteria}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Agregar Criterio
                  </button>
                </div>
                {formCriteria.map((crit, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder={`Criterio ${idx + 1}`}
                      value={crit}
                      onChange={(e) => handleCriteriaChange(idx, e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                    {formCriteria.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCriteria(idx)}
                        style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '6px', padding: '0 10px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Estado del Ciclo de Vida</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="TODO">Por Hacer (TODO)</option>
                  <option value="IN_PROGRESS">En Progreso</option>
                  <option value="TESTING">En Pruebas</option>
                  <option value="ACCEPTED">Aceptada / OK</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#0f766e', color: 'white', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Guardando...' : (editingStory ? 'Actualizar Historia' : 'Crear Historia')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingStory && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 110,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '26px 28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #fecaca'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'grid',
                placeItems: 'center',
                color: '#dc2626',
                fontSize: '20px',
                fontWeight: 800,
                flexShrink: 0
              }}>
                ⚠️
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#991b1b', margin: 0 }}>
                  ¿Eliminar Historia de Usuario?
                </h3>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                  Esta acción eliminará el registro de la historia de usuario en el proyecto.
                </div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{
                  background: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '12px'
                }}>
                  {deletingStory.code}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  {deletingStory.title}
                </span>
              </div>
              {deletingStory.description && (
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                  {deletingStory.description}
                </div>
              )}
            </div>

            {/* Test Case Protection Notice */}
            {(deletingStory.test_cases_count || 0) > 0 && (
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '12px',
                color: '#1e40af',
                marginBottom: '12px',
                lineHeight: 1.45
              }}>
                <strong>🛡️ Protección de Casos de Prueba:</strong> Esta historia tiene{' '}
                <strong>{deletingStory.test_cases_count} caso(s) de prueba</strong> asociado(s). Al eliminarla,
                los casos <em>no se destruirán</em>: se desacoplarán de manera segura y continuarán disponibles
                en el catálogo general del proyecto.
              </div>
            )}

            {/* QA Retention Warning */}
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '12px 14px',
              fontSize: '12px',
              color: '#92400e',
              marginBottom: '14px',
              lineHeight: 1.45
            }}>
              <strong>⚖️ Política de Retención QA:</strong> Si la historia posee ejecuciones de prueba activas o
              registradas en el historial de pruebas, el sistema bloqueará la eliminación para garantizar la
              trazabilidad de auditoría.
            </div>

            {/* Backend Error Display */}
            {deleteError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px 14px',
                color: '#b91c1c',
                fontSize: '13px',
                marginBottom: '14px',
                fontWeight: 600
              }}>
                ✕ {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleteLoading}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: deleteLoading ? 'not-allowed' : 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: deleteLoading ? '#fca5a5' : '#dc2626',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
                }}
              >
                {deleteLoading ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jira Import Modal */}
      {isJiraModalOpen && (
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
            maxWidth: '540px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>🔗</span>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Importar Requerimiento desde Jira
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 18px' }}>
              Conecta directamente con Jira Software para importar requerimientos y criterios de aceptación como Historias de Usuario.
            </p>

            {/* Diagnostic Indicator */}
            {jiraLoading && !jiraStatus && (
              <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Verificando conexión con Jira...
              </div>
            )}

            {jiraStatus && !jiraStatus.configured && (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                padding: '14px 16px',
                borderRadius: '10px',
                marginBottom: '18px',
                fontSize: '13px',
                color: '#92400e'
              }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>⚠️ Integración con Jira no configurada</div>
                <div style={{ lineHeight: 1.5 }}>
                  Para importar desde Jira Cloud, debes configurar las credenciales en el archivo <code>.env</code> del backend:
                  <ul style={{ margin: '6px 0', paddingLeft: '20px' }}>
                    <li><code>JIRA_EMAIL</code> (tu email de Atlassian)</li>
                    <li><code>JIRA_API_TOKEN</code> (token de API de Atlassian)</li>
                    <li><code>JIRA_BASE_URL</code> (ej. https://tu-empresa.atlassian.net)</li>
                  </ul>
                  <em>Nota: La aplicación no simula importaciones cuando las credenciales no están configuradas.</em>
                </div>
              </div>
            )}

            {jiraStatus && jiraStatus.configured && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>✓</span>
                <span>Conexión con Jira Cloud activa y configurada.</span>
              </div>
            )}

            {jiraError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '16px' }}>
                {jiraError}
              </div>
            )}

            <form onSubmit={handleImportJira}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Proyecto Destino
                </label>
                <select
                  value={jiraProjectId}
                  onChange={(e) => setJiraProjectId(Number(e.target.value))}
                  disabled={!!projectId}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Clave del Issue en Jira *
                </label>
                <input
                  type="text"
                  placeholder="Ej. PROJ-101 o HU-45"
                  value={jiraIssueKey}
                  onChange={(e) => setJiraIssueKey(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', textTransform: 'uppercase' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsJiraModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={jiraLoading || Boolean(jiraStatus && !jiraStatus.configured)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: (jiraStatus && !jiraStatus.configured) ? '#94a3b8' : '#0284c7',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: (jiraLoading || (jiraStatus && !jiraStatus.configured)) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {jiraLoading ? 'Importando...' : 'Importar Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default UserStoriesPage;
