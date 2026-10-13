import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { TestCase, PaginatedTestCases, ImportPreviewResponse, ImportCommitResponse, UserStory } from '../types';
import { useAuth } from '../context/AuthContext';

export const TestCasesPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();
  const [cases, setCases] = useState<TestCase[]>([]);
  const [totalCases, setTotalCases] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize] = useState<number>(15);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedUserStory, setSelectedUserStory] = useState<string>('ALL');
  const [userStories, setUserStories] = useState<UserStory[]>([]);

  // Selection & Batch assignment
  const [selectedCaseIds, setSelectedCaseIds] = useState<number[]>([]);
  const [isBatchAssignModalOpen, setIsBatchAssignModalOpen] = useState(false);
  const [batchTargetStoryId, setBatchTargetStoryId] = useState<string>('');
  const [isBatchAssigning, setIsBatchAssigning] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [activeCase, setActiveCase] = useState<TestCase | null>(null);

  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formModule, setFormModule] = useState('Procesos');
  const [formPreconditions, setFormPreconditions] = useState('');
  const [formSteps, setFormSteps] = useState('');
  const [formExpectedResult, setFormExpectedResult] = useState('');
  const [formPriority, setFormPriority] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P2');
  const [formUserStoryId, setFormUserStoryId] = useState<string>('');

  const [importFile, setImportFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewResponse | null>(null);
  const [importStrategy, setImportStrategy] = useState<'SKIP' | 'UPDATE' | 'CANCEL'>('SKIP');
  const [importResult, setImportResult] = useState<ImportCommitResponse | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadUserStories = async () => {
    try {
      const res = await api.get<UserStory[]>('/user-stories?project_id=1');
      setUserStories(res);
    } catch (err: any) {
      console.error('Error al cargar historias de usuario:', err);
    }
  };

  const loadCases = async () => {
    try {
      let url = `/test-cases?project_id=1&page=${page}&page_size=${pageSize}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (selectedPriority !== 'ALL') url += `&priority=${selectedPriority}`;
      if (selectedUserStory === 'UNASSIGNED') {
        url += `&unassigned_story=true`;
      } else if (selectedUserStory !== 'ALL') {
        url += `&user_story_id=${selectedUserStory}`;
      }
      const res = await api.get<PaginatedTestCases>(url);
      setCases(res.items);
      setTotalCases(res.total);
      setTotalPages(res.pages);
    } catch (err: any) {
      showToast('Error al cargar casos: ' + err.message);
    }
  };

  useEffect(() => {
    loadUserStories();
  }, []);

  useEffect(() => {
    loadCases();
  }, [page, searchTerm, selectedPriority, selectedUserStory]);

  const handleDownloadTemplate = async () => {
    try {
      const blob = await api.getBlob('/test-cases/template');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_casos_prueba.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Plantilla descargada correctamente');
    } catch (err: any) {
      showToast('Error al descargar plantilla: ' + err.message);
    }
  };

  const handleToggleAllVisible = () => {
    const visibleIds = cases.map(c => c.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedCaseIds.includes(id));
    if (allSelected) {
      setSelectedCaseIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedCaseIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleCaseSelect = (caseId: number) => {
    setSelectedCaseIds(prev =>
      prev.includes(caseId) ? prev.filter(id => id !== caseId) : [...prev, caseId]
    );
  };

  const handleBatchAssign = async () => {
    if (selectedCaseIds.length === 0) return;
    try {
      setIsBatchAssigning(true);
      const targetId = batchTargetStoryId === '' || batchTargetStoryId === '0' ? null : Number(batchTargetStoryId);
      await api.post('/test-cases/batch-assign-story', {
        test_case_ids: selectedCaseIds,
        user_story_id: targetId
      });
      showToast(`Asignación completada para ${selectedCaseIds.length} caso(s) ✓`);
      setIsBatchAssignModalOpen(false);
      setSelectedCaseIds([]);
      loadCases();
    } catch (err: any) {
      showToast('Error al asignar casos: ' + err.message);
    } finally {
      setIsBatchAssigning(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const stepsArr = formSteps
        ? formSteps.split('\n').map(s => s.trim()).filter(Boolean)
        : ['Paso 1: Abrir pantalla', 'Paso 2: Ejecutar acción', 'Paso 3: Validar respuesta'];

      await api.post('/test-cases', {
        project_id: 1,
        code: formCode,
        title: formTitle,
        preconditions: formPreconditions,
        expected_result: formExpectedResult,
        priority: formPriority,
        steps: stepsArr,
        user_story_id: formUserStoryId ? Number(formUserStoryId) : undefined
      });
      showToast('Caso de prueba creado ✓');
      setIsCreateModalOpen(false);
      resetForm();
      loadCases();
    } catch (err: any) {
      showToast('Error al crear: ' + err.message);
    }
  };

  const openEditModal = (c: TestCase) => {
    setActiveCase(c);
    setFormCode(c.code);
    setFormTitle(c.title);
    setFormModule(c.module_name || 'Procesos');
    setFormPreconditions(c.preconditions || '');
    setFormSteps(c.steps ? c.steps.join('\n') : '');
    setFormExpectedResult(c.expected_result);
    setFormPriority(c.priority);
    setFormUserStoryId(c.user_story_id ? String(c.user_story_id) : '');
    setIsEditModalOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;
    try {
      const stepsArr = formSteps.split('\n').map(s => s.trim()).filter(Boolean);
      await api.put(`/test-cases/${activeCase.id}`, {
        title: formTitle,
        preconditions: formPreconditions,
        steps: stepsArr,
        expected_result: formExpectedResult,
        priority: formPriority,
        user_story_id: formUserStoryId ? Number(formUserStoryId) : 0
      });
      showToast('Caso de prueba actualizado ✓');
      setIsEditModalOpen(false);
      resetForm();
      loadCases();
    } catch (err: any) {
      showToast('Error al actualizar: ' + err.message);
    }
  };

  const openDeleteModal = (c: TestCase) => {
    setActiveCase(c);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!activeCase) return;
    try {
      const res: any = await api.delete(`/test-cases/${activeCase.id}`);
      showToast(res.message || 'Caso procesado exitosamente');
      setIsDeleteModalOpen(false);
      setActiveCase(null);
      loadCases();
    } catch (err: any) {
      showToast('Error al eliminar: ' + err.message);
    }
  };

  const openViewModal = (c: TestCase) => {
    setActiveCase(c);
    setIsViewModalOpen(true);
  };

  const resetForm = () => {
    setFormCode('');
    setFormTitle('');
    setFormModule('Procesos');
    setFormPreconditions('');
    setFormSteps('');
    setFormExpectedResult('');
    setFormPriority('P2');
    setFormUserStoryId('');
    setActiveCase(null);
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      showToast('Por favor selecciona un archivo con formato .xlsx o .xls');
      return;
    }
    setImportFile(file);
    setIsUploading(true);
    setImportPreview(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.postFormData<ImportPreviewResponse>('/test-cases/import/preview?project_id=1', formData);
      setImportPreview(res);
    } catch (err: any) {
      showToast('Error al procesar el archivo: ' + err.message);
      setImportFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importPreview) return;
    const validItems = importPreview.items.filter(it => it.status === 'VALID' || it.status === 'WARNING');
    if (validItems.length === 0) {
      showToast('No hay registros válidos para importar');
      return;
    }

    try {
      setIsUploading(true);
      const res = await api.post<ImportCommitResponse>('/test-cases/import/commit', {
        project_id: 1,
        strategy: importStrategy,
        items: validItems
      });
      setImportResult(res);
      showToast(`Importación completada: ${res.created} creados, ${res.updated} actualizados`);
      loadCases();
    } catch (err: any) {
      showToast('Error en importación: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadErrorReport = async () => {
    if (!importPreview) return;
    const errorItems = importPreview.items.filter(it => it.status === 'ERROR');
    if (errorItems.length === 0) return;
    try {
      const blob = await api.postBlob('/test-cases/import/error-report', errorItems);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reporte_errores_importacion.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showToast('Error al descargar reporte de errores: ' + err.message);
    }
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
  };

  const filtered = cases.filter(c =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ width: '100%', padding: '20px 24px 36px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Catálogo
          </div>
          <h1 style={{ fontSize: '27px', margin: '5px 0', fontWeight: 800, color: '#172033' }}>
            Casos de prueba
          </h1>
          <div style={{ color: '#718096', fontSize: '14px' }}>
            Define los escenarios que serán ejecutados y evaluados.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleDownloadTemplate}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              borderRadius: '8px',
              padding: '10px 14px',
              fontWeight: 650,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📥 Descargar plantilla Excel
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            style={{
              background: '#0f766e',
              color: 'white',
              border: 0,
              borderRadius: '8px',
              padding: '10px 16px',
              fontWeight: 650,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ↥ Importar Excel
          </button>
          <button
            onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
            style={{
              background: '#14b8a6',
              color: 'white',
              border: 0,
              borderRadius: '8px',
              padding: '10px 16px',
              fontWeight: 650,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            ＋ Nuevo caso
          </button>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '20px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
          <input
            placeholder="🔎 Buscar por código o nombre..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
            style={{ padding: '9px 12px', border: '1px solid #e6eaf0', borderRadius: '8px', outline: 'none', fontSize: '13px', minWidth: '240px' }}
          />
          <select
            value={selectedUserStory}
            onChange={e => { setSelectedUserStory(e.target.value); setPage(1); }}
            style={{ padding: '9px 12px', border: '1px solid #e6eaf0', borderRadius: '8px', outline: 'none', fontSize: '13px', minWidth: '200px' }}
          >
            <option value="ALL">Todas las historias</option>
            <option value="UNASSIGNED">Sin historia (Huérfanos)</option>
            {userStories.map(us => (
              <option key={us.id} value={us.id}>
                {us.code} - {us.title}
              </option>
            ))}
          </select>
          <select
            value={selectedModule}
            onChange={e => setSelectedModule(e.target.value)}
            style={{ padding: '9px 12px', border: '1px solid #e6eaf0', borderRadius: '8px', outline: 'none', fontSize: '13px' }}
          >
            <option value="ALL">Todos los módulos</option>
            <option value="Procesos">Procesos</option>
            <option value="Catálogo">Catálogo</option>
            <option value="FUID">FUID</option>
            <option value="Workflow">Workflow</option>
          </select>
          <select
            value={selectedPriority}
            onChange={e => { setSelectedPriority(e.target.value); setPage(1); }}
            style={{ padding: '9px 12px', border: '1px solid #e6eaf0', borderRadius: '8px', outline: 'none', fontSize: '13px' }}
          >
            <option value="ALL">Todas las prioridades</option>
            <option value="P1">Prioridad P1</option>
            <option value="P2">Prioridad P2</option>
            <option value="P3">Prioridad P3</option>
            <option value="P4">Prioridad P4</option>
          </select>
        </div>

        {selectedCaseIds.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f0fdfa',
            border: '1px solid #99f6e4',
            borderRadius: '8px',
            padding: '10px 16px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f766e' }}>
              ✓ {selectedCaseIds.length} caso(s) seleccionado(s)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setSelectedCaseIds([])}
                style={{
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                Deseleccionar todos
              </button>
              <button
                type="button"
                onClick={() => setIsBatchAssignModalOpen(true)}
                style={{
                  background: '#0f766e',
                  color: 'white',
                  border: 0,
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Asignar a Historia de Usuario
              </button>
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e6eaf0', textAlign: 'left', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                <th style={{ padding: '12px', width: '36px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={cases.length > 0 && cases.every(c => selectedCaseIds.includes(c.id))}
                    onChange={handleToggleAllVisible}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '12px' }}>Código</th>
                <th style={{ padding: '12px' }}>Caso</th>
                <th style={{ padding: '12px' }}>Historia de usuario</th>
                <th style={{ padding: '12px' }}>Módulo</th>
                <th style={{ padding: '12px' }}>Precondición</th>
                <th style={{ padding: '12px' }}>Prioridad</th>
                <th style={{ padding: '12px' }}>Último resultado</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cases.filter(c => selectedModule === 'ALL' || (c.module_name || '').toLowerCase() === selectedModule.toLowerCase()).map(c => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: '1px solid #e6eaf0',
                    background: selectedCaseIds.includes(c.id) ? '#f0fdf4' : 'transparent'
                  }}
                >
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedCaseIds.includes(c.id)}
                      onChange={() => handleToggleCaseSelect(c.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700 }}>{c.code}</td>
                  <td style={{ padding: '12px', color: '#1e293b' }}>
                    {c.title}
                    {c.is_ai_generated && (
                      <span style={{ marginLeft: '6px', background: '#ecfeff', color: '#0f766e', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        ✦ IA
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {c.user_story_code ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/user-stories/${c.user_story_id}`)}
                        title={c.user_story_title || ''}
                        style={{
                          background: '#ecfeff',
                          color: '#0f766e',
                          border: '1px solid #a5f3fc',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        📖 {c.user_story_code}
                      </button>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>Sin asignar</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', color: '#475569' }}>{c.module_name || 'Procesos'}</td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{c.preconditions || '—'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: c.priority === 'P1' ? '#fee2e2' : c.priority === 'P2' ? '#fef3c7' : '#e2e8f0',
                      color: c.priority === 'P1' ? '#b91c1c' : c.priority === 'P2' ? '#b45309' : '#475569'
                    }}>
                      {c.priority}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {c.last_result === 'PASSED' && (
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 750 }}>
                        PASÓ
                      </span>
                    )}
                    {c.last_result === 'BUG' && (
                      <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 750 }}>
                        BUG
                      </span>
                    )}
                    {c.last_result === 'IMPROVEMENT' && (
                      <span style={{ background: '#fef3c7', color: '#a16207', padding: '4px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 750 }}>
                        MEJORA
                      </span>
                    )}
                    {!c.last_result && <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => openViewModal(c)}
                        title="Ver detalle"
                        style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        👁 Ver
                      </button>
                      <button
                        onClick={() => openEditModal(c)}
                        title="Editar caso"
                        style={{ background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                      >
                        ✏ Editar
                      </button>
                      <button
                        onClick={() => openDeleteModal(c)}
                        title="Eliminar caso"
                        style={{ background: '#ffe4e6', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                      >
                        🗑 Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid #e6eaf0', paddingTop: '14px', fontSize: '13px', color: '#64748b' }}>
          <div>
            Mostrando {totalCases > 0 ? (page - 1) * pageSize + 1 : 0} – {Math.min(page * pageSize, totalCases)} de {totalCases} casos de prueba
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              style={{
                background: page <= 1 ? '#f1f5f9' : 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                color: page <= 1 ? '#94a3b8' : '#334155'
              }}
            >
              ◀ Anterior
            </button>
            <span style={{ padding: '6px 10px', fontWeight: 700, color: '#0f766e' }}>
              Página {page} de {totalPages || 1}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              style={{
                background: page >= totalPages ? '#f1f5f9' : 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                color: page >= totalPages ? '#94a3b8' : '#334155'
              }}
            >
              Siguiente ▶
            </button>
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: 'min(640px, 100%)', borderRadius: '12px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700 }}>Nuevo caso de prueba</h2>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Código *</label>
                  <input
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                    placeholder="WF-050"
                    required
                    style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Título *</label>
                  <input
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="Ej. Validar exportación de reportes"
                    required
                    style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Módulo</label>
                  <select
                    value={formModule}
                    onChange={e => setFormModule(e.target.value)}
                    style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
                  >
                    <option value="Procesos">Procesos</option>
                    <option value="Catálogo">Catálogo</option>
                    <option value="FUID">FUID</option>
                    <option value="Workflow">Workflow</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Prioridad</label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as any)}
                    style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
                  >
                    <option value="P1">P1 - Crítico</option>
                    <option value="P2">P2 - Medio</option>
                    <option value="P3">P3 - Bajo</option>
                    <option value="P4">P4 - Opcional</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Historia de Usuario</label>
                <select
                  value={formUserStoryId}
                  onChange={e => setFormUserStoryId(e.target.value)}
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
                >
                  <option value="">(Sin asignar)</option>
                  {userStories.map(us => (
                    <option key={us.id} value={us.id}>
                      {us.code} - {us.title}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Precondiciones</label>
                <input
                  value={formPreconditions}
                  onChange={e => setFormPreconditions(e.target.value)}
                  placeholder="Ej. Usuario autenticado con rol QA"
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Pasos (uno por línea)</label>
                <textarea
                  value={formSteps}
                  onChange={e => setFormSteps(e.target.value)}
                  placeholder="1. Abrir pantalla&#10;2. Ejecutar acción&#10;3. Validar resultado"
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', minHeight: '80px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Resultado esperado *</label>
                <textarea
                  value={formExpectedResult}
                  onChange={e => setFormExpectedResult(e.target.value)}
                  placeholder="El sistema debe responder..."
                  required
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', minHeight: '80px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '9px 14px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: '#14b8a6', color: 'white', border: 0, borderRadius: '8px', padding: '9px 16px', fontWeight: 650, cursor: 'pointer' }}
                >
                  Guardar caso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && activeCase && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: 'min(640px, 100%)', borderRadius: '12px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700 }}>Editar caso de prueba: {activeCase.code}</h2>
            <form onSubmit={handleEdit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Título *</label>
                <input
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  required
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Módulo</label>
                  <input
                    value={formModule}
                    disabled
                    style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', background: '#f8fafc', color: '#64748b', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Prioridad</label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as any)}
                    style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
                  >
                    <option value="P1">P1 - Crítico</option>
                    <option value="P2">P2 - Medio</option>
                    <option value="P3">P3 - Bajo</option>
                    <option value="P4">P4 - Opcional</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Historia de Usuario</label>
                <select
                  value={formUserStoryId}
                  onChange={e => setFormUserStoryId(e.target.value)}
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
                >
                  <option value="">(Sin asignar)</option>
                  {userStories.map(us => (
                    <option key={us.id} value={us.id}>
                      {us.code} - {us.title}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Precondiciones</label>
                <input
                  value={formPreconditions}
                  onChange={e => setFormPreconditions(e.target.value)}
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Pasos (uno por línea)</label>
                <textarea
                  value={formSteps}
                  onChange={e => setFormSteps(e.target.value)}
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', minHeight: '80px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Resultado esperado *</label>
                <textarea
                  value={formExpectedResult}
                  onChange={e => setFormExpectedResult(e.target.value)}
                  required
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', minHeight: '80px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '9px 14px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: '#0f766e', color: 'white', border: 0, borderRadius: '8px', padding: '9px 16px', fontWeight: 650, cursor: 'pointer' }}
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {isViewModalOpen && activeCase && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: 'min(640px, 100%)', borderRadius: '12px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase' }}>
                  {activeCase.module_name || 'Módulo General'}
                </span>
                <h2 style={{ margin: '4px 0 0', fontSize: '19px', fontWeight: 800, color: '#1e293b' }}>
                  {activeCase.code} — {activeCase.title}
                </h2>
              </div>
              <span style={{
                fontWeight: 750,
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                background: activeCase.priority === 'P1' ? '#fee2e2' : activeCase.priority === 'P2' ? '#fef3c7' : '#e2e8f0',
                color: activeCase.priority === 'P1' ? '#b91c1c' : activeCase.priority === 'P2' ? '#b45309' : '#475569'
              }}>
                {activeCase.priority}
              </span>
            </div>
            <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#334155' }}>
              <div style={{ marginBottom: '12px' }}>
                <strong>Historia de Usuario:</strong>
                <p style={{ margin: '4px 0', color: '#64748b' }}>
                  {activeCase.user_story_code ? (
                    <span style={{ color: '#0f766e', fontWeight: 650 }}>
                      📖 {activeCase.user_story_code} — {activeCase.user_story_title}
                    </span>
                  ) : (
                    'Sin asignar'
                  )}
                </p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>Precondiciones:</strong>
                <p style={{ margin: '4px 0', color: '#64748b' }}>{activeCase.preconditions || 'Ninguna'}</p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>Pasos de ejecución:</strong>
                <ol style={{ margin: '4px 0', paddingLeft: '20px', color: '#475569' }}>
                  {activeCase.steps && activeCase.steps.length > 0 ? (
                    activeCase.steps.map((st, i) => <li key={i}>{st}</li>)
                  ) : (
                    <li>Sin pasos detallados</li>
                  )}
                </ol>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong>Resultado esperado:</strong>
                <div style={{ margin: '4px 0', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {activeCase.expected_result}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setIsViewModalOpen(false)}
                style={{ background: '#0f766e', color: 'white', border: 0, borderRadius: '8px', padding: '9px 16px', fontWeight: 650, cursor: 'pointer' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH ASSIGN MODAL */}
      {isBatchAssignModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: 'min(520px, 100%)', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 700 }}>Asignar casos a Historia de Usuario</h2>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13px' }}>
              Se asignarán los <b>{selectedCaseIds.length}</b> caso(s) seleccionados a la Historia de Usuario elegida.
            </p>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Historia de Usuario destino</label>
              <select
                value={batchTargetStoryId}
                onChange={e => setBatchTargetStoryId(e.target.value)}
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', fontSize: '13px', boxSizing: 'border-box' }}
              >
                <option value="">-- Seleccionar Historia de Usuario --</option>
                <option value="0">Desvincular (dejar sin historia de usuario)</option>
                {userStories.map(us => (
                  <option key={us.id} value={us.id}>
                    {us.code} - {us.title}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsBatchAssignModalOpen(false)}
                disabled={isBatchAssigning}
                style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '9px 14px', cursor: 'pointer', fontSize: '13px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBatchAssign}
                disabled={isBatchAssigning}
                style={{ background: '#0f766e', color: 'white', border: 0, borderRadius: '8px', padding: '9px 18px', fontWeight: 650, cursor: 'pointer', fontSize: '13px' }}
              >
                {isBatchAssigning ? 'Asignando...' : 'Confirmar asignación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && activeCase && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: 'min(500px, 100%)', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 700, color: '#b91c1c' }}>
              Eliminar caso de prueba
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 16px' }}>
              ¿Estás seguro de que deseas eliminar este caso de prueba?
            </p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <div><strong>Código:</strong> {activeCase.code}</div>
              <div style={{ marginTop: '4px' }}><strong>Título:</strong> {activeCase.title}</div>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
              🛡 <em>Nota de seguridad:</em> Si este caso ya cuenta con ejecuciones históricas, evidencias o incidencias asociadas, el sistema lo archivará automáticamente para garantizar la trazabilidad de QA.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => { setIsDeleteModalOpen(false); setActiveCase(null); }}
                style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px 14px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                style={{ background: '#e11d48', color: 'white', border: 0, borderRadius: '8px', padding: '9px 16px', fontWeight: 650, cursor: 'pointer' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT WORKFLOW MODAL */}
      {isImportModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: 'min(820px, 100%)', borderRadius: '14px', padding: '26px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#172033' }}>
                  Importar casos de prueba desde Excel
                </h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                  Selecciona un archivo Excel utilizando la plantilla oficial de TestFlow QA.
                </p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                style={{ background: '#ecfeff', border: '1px solid #99f6e4', color: '#0f766e', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                📥 Descargar plantilla
              </button>
            </div>

            {!importPreview && !importResult && (
              <div>
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: isDragOver ? '2px dashed #0f766e' : '2px dashed #cbd5e1',
                    background: isDragOver ? '#f0fdfa' : '#f8fafc',
                    borderRadius: '12px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all .2s'
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                    accept=".xlsx,.xls"
                    style={{ display: 'none' }}
                  />
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>📊</div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>
                    Arrastra tu archivo Excel aquí o haz clic para seleccionar
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '6px' }}>
                    Formatos soportados: .xlsx, .xls (máximo 10 MB)
                  </div>
                </div>
                {isUploading && (
                  <div style={{ textAlign: 'center', marginTop: '16px', color: '#0f766e', fontWeight: 600, fontSize: '13px' }}>
                    Analizando y validando estructura del archivo...
                  </div>
                )}
              </div>
            )}

            {importPreview && !importResult && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', margin: '16px 0' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Archivo</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {importPreview.filename}
                    </div>
                  </div>
                  <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#15803d' }}>Válidos</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803d' }}>{importPreview.valid_count}</div>
                  </div>
                  <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#b45309' }}>Advertencias</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#b45309' }}>{importPreview.warning_count}</div>
                  </div>
                  <div style={{ background: '#fee2e2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#b91c1c' }}>Errores</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#b91c1c' }}>{importPreview.error_count}</div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                    Estrategia ante códigos existentes en base de datos:
                  </label>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="dup_strategy"
                        value="SKIP"
                        checked={importStrategy === 'SKIP'}
                        onChange={() => setImportStrategy('SKIP')}
                      />
                      <span>Omitir duplicados</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="dup_strategy"
                        value="UPDATE"
                        checked={importStrategy === 'UPDATE'}
                        onChange={() => setImportStrategy('UPDATE')}
                      />
                      <span>Actualizar casos existentes</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="dup_strategy"
                        value="CANCEL"
                        checked={importStrategy === 'CANCEL'}
                        onChange={() => setImportStrategy('CANCEL')}
                      />
                      <span>Cancelar importación</span>
                    </label>
                  </div>
                </div>

                <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, textAlign: 'left', color: '#475569' }}>
                        <th style={{ padding: '8px' }}>Fila</th>
                        <th style={{ padding: '8px' }}>Código</th>
                        <th style={{ padding: '8px' }}>Título</th>
                        <th style={{ padding: '8px' }}>Módulo</th>
                        <th style={{ padding: '8px' }}>Prioridad</th>
                        <th style={{ padding: '8px' }}>Estado</th>
                        <th style={{ padding: '8px' }}>Observación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px', color: '#64748b' }}>{it.row_number}</td>
                          <td style={{ padding: '8px', fontWeight: 700 }}>{it.code || '—'}</td>
                          <td style={{ padding: '8px', color: '#1e293b' }}>{it.title || '—'}</td>
                          <td style={{ padding: '8px', color: '#475569' }}>{it.module_name || 'General'}</td>
                          <td style={{ padding: '8px' }}>{it.priority}</td>
                          <td style={{ padding: '8px' }}>
                            {it.status === 'VALID' && (
                              <span style={{ color: '#15803d', fontWeight: 700 }}>✓ Válido</span>
                            )}
                            {it.status === 'WARNING' && (
                              <span style={{ color: '#b45309', fontWeight: 700 }}>⚠ Duplicado</span>
                            )}
                            {it.status === 'ERROR' && (
                              <span style={{ color: '#b91c1c', fontWeight: 700 }}>✕ Error</span>
                            )}
                          </td>
                          <td style={{ padding: '8px', color: it.status === 'ERROR' ? '#b91c1c' : '#64748b', fontSize: '11px' }}>
                            {it.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {importPreview.error_count > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '14px' }}>
                    <button
                      onClick={handleDownloadErrorReport}
                      style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 650, cursor: 'pointer' }}
                    >
                      📄 Descargar reporte de errores Excel
                    </button>
                  </div>
                )}
              </div>
            )}

            {importResult && (
              <div style={{ textAlign: 'center', padding: '24px 10px' }}>
                <div style={{ fontSize: '42px', marginBottom: '10px' }}>🎉</div>
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: '#15803d' }}>
                  Importación completada
                </h3>
                <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 20px' }}>
                  Se han procesado {importResult.processed} registros exitosamente.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '24px' }}>
                  <div style={{ background: '#dcfce7', borderRadius: '8px', padding: '12px 20px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d' }}>{importResult.created}</div>
                    <div style={{ fontSize: '12px', color: '#166534' }}>Casos Creados</div>
                  </div>
                  <div style={{ background: '#e0f2fe', borderRadius: '8px', padding: '12px 20px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0369a1' }}>{importResult.updated}</div>
                    <div style={{ fontSize: '12px', color: '#075985' }}>Casos Actualizados</div>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '12px 20px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#475569' }}>{importResult.skipped}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Casos Omitidos</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <button
                onClick={closeImportModal}
                style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', cursor: 'pointer' }}
              >
                {importResult ? 'Cerrar' : 'Cancelar'}
              </button>
              {importPreview && !importResult && (
                <button
                  disabled={isUploading || (importPreview.valid_count === 0 && importPreview.warning_count === 0)}
                  onClick={handleCommitImport}
                  style={{
                    background: '#0f766e',
                    color: 'white',
                    border: 0,
                    borderRadius: '8px',
                    padding: '9px 18px',
                    fontWeight: 650,
                    fontSize: '13px',
                    cursor: (importPreview.valid_count === 0 && importPreview.warning_count === 0) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isUploading ? 'Procesando...' : `Importar casos (${importPreview.valid_count + importPreview.warning_count})`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
