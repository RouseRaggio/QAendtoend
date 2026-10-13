import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AIGenerateResponse, AIGeneratedCase } from '../types';

interface StoryAIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: number;
  storyCode: string;
  storyTitle: string;
  storyDescription?: string;
  acceptanceCriteria?: string[];
  businessRules?: string;
  projectId: number;
  onSuccess: () => void;
}

export const StoryAIGeneratorModal: React.FC<StoryAIGeneratorModalProps> = ({
  isOpen,
  onClose,
  storyId,
  storyCode,
  storyTitle,
  storyDescription = '',
  acceptanceCriteria = [],
  businessRules = '',
  projectId,
  onSuccess
}) => {
  const { showToast } = useAuth();

  // Test type categories configuration
  const [testTypes, setTestTypes] = useState({
    positive: true,
    negative: true,
    validation: true,
    boundary: true,
    security: false,
    integration: false
  });

  const [detailLevel, setDetailLevel] = useState<'STANDARD' | 'HIGH'>('HIGH');
  const [additionalContext, setAdditionalContext] = useState(businessRules || '');

  // Generation flow state
  const [isGenerating, setIsGenerating] = useState(false);
  const [stepMessage, setStepMessage] = useState('');
  const [generatedCases, setGeneratedCases] = useState<AIGeneratedCase[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<AIGeneratedCase | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedCases([]);
    setSelectedIndices([]);
    setEditingIndex(null);

    setStepMessage(`Analizando la Historia ${storyCode} y generando casos con IA...`);

    try {
      const activeTypes = Object.entries(testTypes)
        .filter(([_, checked]) => checked)
        .map(([key]) => key.toUpperCase());

      if (activeTypes.length === 0) {
        showToast('Selecciona al menos una categoría de pruebas');
        setIsGenerating(false);
        return;
      }

      const res = await api.post<AIGenerateResponse>('/ai/generate', {
        project_id: projectId,
        user_story_id: storyId,
        title: storyTitle,
        story_text: storyDescription || storyTitle,
        acceptance_criteria: acceptanceCriteria,
        business_rules: additionalContext,
        test_types: activeTypes,
        detail_level: detailLevel
      });

      setGeneratedCases(res.test_cases || []);
      // By default, select all generated cases for user review
      setSelectedIndices((res.test_cases || []).map((_, idx) => idx));
      showToast(`${res.test_cases?.length || 0} casos generados con IA para revisión ✓`);
    } catch (err: any) {
      showToast('Error al generar casos: ' + err.message);
    } finally {
      setIsGenerating(false);
      setStepMessage('');
    }
  };

  const handleToggleSelectCase = (idx: number) => {
    if (selectedIndices.includes(idx)) {
      setSelectedIndices(selectedIndices.filter(i => i !== idx));
    } else {
      setSelectedIndices([...selectedIndices, idx]);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIndices.length === generatedCases.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(generatedCases.map((_, idx) => idx));
    }
  };

  const handleDiscardCase = (idx: number) => {
    const updated = generatedCases.filter((_, i) => i !== idx);
    setGeneratedCases(updated);
    setSelectedIndices(selectedIndices.filter(i => i !== idx).map(i => (i > idx ? i - 1 : i)));
    if (editingIndex === idx) {
      setEditingIndex(null);
      setEditForm(null);
    }
    showToast('Caso descartado');
  };

  const handleStartEdit = (idx: number) => {
    setEditingIndex(idx);
    setEditForm({ ...generatedCases[idx] });
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !editForm) return;
    const updated = [...generatedCases];
    updated[editingIndex] = editForm;
    setGeneratedCases(updated);
    setEditingIndex(null);
    setEditForm(null);
    showToast('Caso editado ✓');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleSaveSelectedCases = async () => {
    if (selectedIndices.length === 0) {
      showToast('Selecciona al menos un caso generado para guardar');
      return;
    }

    const casesToApprove = selectedIndices.map(idx => generatedCases[idx]);
    setIsSaving(true);
    try {
      await api.post('/ai/approve', {
        project_id: projectId,
        user_story_id: storyId,
        cases: casesToApprove.map(c => ({
          title: c.title,
          preconditions: c.preconditions,
          steps: c.steps,
          expected_result: c.expected_result,
          priority: c.priority,
          tags: ['IA-Generado', c.test_type]
        }))
      });

      showToast(`${casesToApprove.length} casos guardados y asociados a ${storyCode} ✓`);
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('Error al persistir casos: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isGenerating && !isSaving) onClose();
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '960px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, #0f766e 0%, #0d5f57 100%)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '18px' }}>✦</span>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                Generar Casos de Prueba con IA
              </h2>
              <span
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                {storyCode}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#ccfbf1', maxWidth: '780px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {storyTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating || isSaving}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              width: '32px',
              height: '32px',
              cursor: isGenerating || isSaving ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* User Story Context Card */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Contexto de la Historia de Usuario
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {acceptanceCriteria.length} criterio(s) de aceptación
              </span>
            </div>
            {storyDescription && (
              <p style={{ fontSize: '13px', color: '#1e293b', margin: '0 0 10px', lineHeight: 1.45 }}>
                {storyDescription}
              </p>
            )}
            {acceptanceCriteria.length > 0 ? (
              <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '10px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f766e', marginBottom: '6px' }}>
                  Criterios de Aceptación:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#334155' }}>
                  {acceptanceCriteria.map((c, i) => (
                    <li key={i} style={{ marginBottom: '3px' }}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                Sin criterios de aceptación específicos; la IA utilizará el título y descripción.
              </div>
            )}
          </div>

          {/* Test Categories Configuration */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
              Categorías de Prueba a Generar:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={testTypes.positive}
                  onChange={(e) => setTestTypes({ ...testTypes, positive: e.target.checked })}
                />
                <span>✓ Escenarios positivos</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={testTypes.negative}
                  onChange={(e) => setTestTypes({ ...testTypes, negative: e.target.checked })}
                />
                <span>✗ Escenarios negativos</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={testTypes.validation}
                  onChange={(e) => setTestTypes({ ...testTypes, validation: e.target.checked })}
                />
                <span>⚠ Validación campos</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={testTypes.boundary}
                  onChange={(e) => setTestTypes({ ...testTypes, boundary: e.target.checked })}
                />
                <span>⇲ Casos borde y límites</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={testTypes.security}
                  onChange={(e) => setTestTypes({ ...testTypes, security: e.target.checked })}
                />
                <span>🔒 Permisos y seguridad</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={testTypes.integration}
                  onChange={(e) => setTestTypes({ ...testTypes, integration: e.target.checked })}
                />
                <span>⚡ Manejo de errores</span>
              </label>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Reglas de negocio o contexto adicional (opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej. Formatos requeridos, perfiles admitidos..."
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  style={{ width: '100%', padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Nivel de detalle:
                </label>
                <select
                  value={detailLevel}
                  onChange={(e: any) => setDetailLevel(e.target.value)}
                  style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: 'white' }}
                >
                  <option value="HIGH">Detallado (Alto)</option>
                  <option value="STANDARD">Estándar</option>
                </select>
              </div>
              <div style={{ alignSelf: 'flex-end' }}>
                <button
                  type="button"
                  data-testid="ai-generate-preview-btn"
                  onClick={handleGenerate}
                  disabled={isGenerating || isSaving}
                  style={{
                    background: '#0f766e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isGenerating || isSaving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isGenerating ? '✦ Generando...' : '✦ Generar Casos con IA'}
                </button>
              </div>
            </div>

            {isGenerating && (
              <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner" style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                <span>{stepMessage || 'Procesando con asistente IA...'}</span>
              </div>
            )}
          </div>

          {/* Generated Cases Preview List */}
          {generatedCases.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  Casos Propuestos por la IA ({generatedCases.length})
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                    ({selectedIndices.length} seleccionados para guardar)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    style={{ background: 'none', border: 'none', color: '#0f766e', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {selectedIndices.length === generatedCases.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
                {generatedCases.map((c, idx) => {
                  const isSelected = selectedIndices.includes(idx);
                  const isEditingThis = editingIndex === idx;

                  if (isEditingThis && editForm) {
                    return (
                      <div
                        key={idx}
                        style={{
                          background: '#fff',
                          border: '2px solid #0f766e',
                          borderRadius: '10px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f766e' }}>
                          Editando Caso #{idx + 1}
                        </div>
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          placeholder="Título del caso"
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                        <textarea
                          rows={2}
                          value={editForm.preconditions}
                          onChange={(e) => setEditForm({ ...editForm, preconditions: e.target.value })}
                          placeholder="Precondiciones"
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                        />
                        <textarea
                          rows={3}
                          value={editForm.steps.join('\n')}
                          onChange={(e) => setEditForm({ ...editForm, steps: e.target.value.split('\n') })}
                          placeholder="Pasos (uno por línea)"
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                        />
                        <textarea
                          rows={2}
                          value={editForm.expected_result}
                          onChange={(e) => setEditForm({ ...editForm, expected_result: e.target.value })}
                          placeholder="Resultado esperado"
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', fontSize: '12px', cursor: 'pointer' }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#0f766e', color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Guardar Cambios
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      style={{
                        background: isSelected ? '#f8fafc' : '#ffffff',
                        border: isSelected ? '1px solid #0f766e' : '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        opacity: isSelected ? 1 : 0.65
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectCase(idx)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f766e', background: '#ecfeff', padding: '2px 6px', borderRadius: '4px' }}>
                            {c.test_type}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: c.priority === 'P1' ? '#991b1b' : '#92400e', background: c.priority === 'P1' ? '#fee2e2' : '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
                            {c.priority}
                          </span>
                          <b style={{ fontSize: '13px', color: '#0f172a' }}>{c.title}</b>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(idx)}
                            style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', color: '#0f766e', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDiscardCase(idx)}
                            style={{ background: 'white', border: '1px solid #fee2e2', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Descartar
                          </button>
                        </div>
                      </div>

                      {c.preconditions && (
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          <b>Precondición:</b> {c.preconditions}
                        </div>
                      )}

                      {c.steps && c.steps.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#334155' }}>
                          <b>Pasos:</b>
                          <ol style={{ margin: '2px 0 0', paddingLeft: '18px' }}>
                            {c.steps.map((st, sidx) => (
                              <li key={sidx}>{st}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      <div style={{ fontSize: '12px', color: '#15803d' }}>
                        <b>Resultado Esperado:</b> {c.expected_result}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {generatedCases.length > 0
              ? `${selectedIndices.length} de ${generatedCases.length} casos seleccionados para incorporación.`
              : 'Configura las categorías y presiona "Generar Casos con IA" para previsualizar.'}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: 'white',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer'
              }}
            >
              Cerrar
            </button>
            <button
              type="button"
              data-testid="ai-save-selected-btn"
              onClick={handleSaveSelectedCases}
              disabled={isSaving || selectedIndices.length === 0}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: '#0f766e',
                color: 'white',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isSaving || selectedIndices.length === 0 ? 'not-allowed' : 'pointer',
                opacity: isSaving || selectedIndices.length === 0 ? 0.6 : 1
              }}
            >
              {isSaving ? 'Guardando en BD...' : `Confirmar y Guardar (${selectedIndices.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
