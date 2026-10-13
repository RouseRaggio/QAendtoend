import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { EvidenceDropzone, EvidenceDraft } from './EvidenceDropzone';
import { TestCase } from '../types';

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  testCases: TestCase[];
  activeExecutionId?: number;
  initialTestCaseId?: number;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  testCases,
  activeExecutionId = 1,
  initialTestCaseId
}) => {
  const { showToast } = useAuth();
  const [selectedCaseId, setSelectedCaseId] = useState<number>(
    initialTestCaseId || (testCases.length > 0 ? testCases[0].id : 1)
  );
  const [status, setStatus] = useState<string>('PASSED');
  const [severity, setSeverity] = useState<string>('NONE');
  const [priority, setPriority] = useState<string>('P2');
  const [actualResult, setActualResult] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [evidenceList, setEvidenceList] = useState<EvidenceDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentCase = testCases.find(tc => tc.id === Number(selectedCaseId)) || testCases[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('test_case_id', String(selectedCaseId));
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

      await api.postFormData('/executions/' + activeExecutionId + '/results', formData);
      showToast('Resultado guardado con ' + evidenceList.length + ' evidencia(s) ✓');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('Error al guardar: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        width: 'min(780px, 100%)',
        maxHeight: '90vh',
        overflowY: 'auto',
        borderRadius: '14px',
        padding: '24px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ejecución actual · GESTADOC
            </div>
            <h2 style={{ margin: '4px 0', fontSize: '20px', fontWeight: 750, color: '#172033' }}>
              Registrar resultado
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 0,
              background: '#f1f5f9',
              borderRadius: '8px',
              width: '34px',
              height: '34px',
              fontSize: '18px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Caso de prueba
              </label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(Number(e.target.value))}
                style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px' }}
              >
                {testCases.map(tc => (
                  <option key={tc.id} value={tc.id}>
                    {tc.code} — {tc.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Severidad
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px' }}
              >
                <option value="NONE">No aplica</option>
                <option value="CRITICAL">Crítica</option>
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Media</option>
                <option value="LOW">Baja</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px' }}
              >
                <option value="P1">P1 — Alta</option>
                <option value="P2">P2 — Media</option>
                <option value="P3">P3 — Baja</option>
                <option value="P4">P4 — Opcional</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Resultado esperado
              </label>
              <div style={{ background: '#f8fafc', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#475569' }}>
                {currentCase?.expected_result || 'El sistema debe completar la operación con éxito.'}
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Resultado obtenido
              </label>
              <textarea
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
                placeholder="Describe qué ocurrió durante la ejecución..."
                style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', minHeight: '80px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Clasificación del resultado
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { label: '🟢 PASÓ', val: 'PASSED', bg: status === 'PASSED' ? '#ecfdf5' : '#fff' },
                  { label: '🔴 BUG', val: 'BUG', bg: status === 'BUG' ? '#fff1f2' : '#fff' },
                  { label: '🟡 MEJORA', val: 'IMPROVEMENT', bg: status === 'IMPROVEMENT' ? '#fefce8' : '#fff' },
                  { label: '🟣 BLOQUEADO', val: 'BLOCKED', bg: status === 'BLOCKED' ? '#f5f3ff' : '#fff' },
                ].map(opt => (
                  <label
                    key={opt.val}
                    style={{
                      padding: '10px 14px',
                      border: '1px solid #e6eaf0',
                      borderRadius: '9px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: opt.bg,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <input
                      type="radio"
                      name="modal-classification"
                      value={opt.val}
                      checked={status === opt.val}
                      onChange={() => setStatus(opt.val)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Evidencias <span style={{ fontWeight: 400, color: '#718096' }}>(Ctrl + V disponible)</span>
              </label>
              <EvidenceDropzone
                evidenceList={evidenceList}
                onChange={setEvidenceList}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Observaciones
              </label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Información adicional..."
                style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', minHeight: '60px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '9px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'white',
                border: '1px solid #e6eaf0',
                borderRadius: '8px',
                padding: '10px 16px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: '#14b8a6',
                color: 'white',
                border: 0,
                borderRadius: '8px',
                padding: '10px 18px',
                fontWeight: 650,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar resultado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
