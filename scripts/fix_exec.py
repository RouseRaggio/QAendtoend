with open('frontend/src/pages/ExecuteTestPage.tsx', 'w', encoding='utf-8') as f:
    f.write('''import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { TestCase } from '../types';
import { EvidenceDropzone, EvidenceDraft } from '../components/EvidenceDropzone';
import { useAuth } from '../context/AuthContext';

export const ExecuteTestPage: React.FC = () => {
  const { showToast } = useAuth();
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(2);
  const [actualResult, setActualResult] = useState<string>(
    'El sistema muestra el mensaje "Proceso actualizado correctamente", pero al volver al catalogo el nombre anterior continua apareciendo.'
  );
  const [status, setStatus] = useState<string>('BUG');
  const [severity, setSeverity] = useState<string>('HIGH');
  const [priority, setPriority] = useState<string>('P1');
  const [observations, setObservations] = useState<string>('');
  const [evidenceList, setEvidenceList] = useState<EvidenceDraft[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    api.get<TestCase[]>('/test-cases?project_id=1').then((res) => {
      setTestCases(res);
    });
  }, []);

  const currentCase = testCases[currentIndex] || {
    id: 3,
    code: 'WF-003',
    title: 'Guardar proceso despues de editar',
    description: 'Verificar que un proceso existente pueda editarse y guardarse correctamente.',
    preconditions: 'Usuario autenticado con permisos de edicion y un proceso existente.',
    steps: [
      'Ingresar al modulo Workflow.',
      'Seleccionar un proceso existente.',
      'Presionar Editar.',
      'Modificar el nombre del proceso.',
      'Presionar Guardar.'
    ],
    expected_result: 'El sistema debe guardar los cambios y mostrar la informacion actualizada en el catalogo.',
    priority: 'P1'
  };

  const handleNext = () => {
    if (currentIndex < testCases.length - 1) {
      setCurrentIndex(currentIndex + 1);
      showToast('Caso siguiente cargado');
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      showToast('Caso anterior cargado');
    }
  };

  const handleSaveResult = async () => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('test_case_id', String(currentCase.id));
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

      await api.postFormData('/executions/1/results', formData);
      showToast('Resultado guardado con ' + evidenceList.length + ' evidencia(s) ✓');
    } catch (err: any) {
      showToast('Error al guardar resultado: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1500px', margin: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Ejecucion · GESTADOC / Workflow
          </div>
          <h1 style={{ fontSize: '27px', margin: '5px 0', fontWeight: 800, color: '#172033' }}>
            Ejecutar caso de prueba
          </h1>
          <div style={{ color: '#718096', fontSize: '14px' }}>
            {currentCase.code} · {currentCase.title}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handlePrev}
            style={{
              background: 'white',
              border: '1px solid #e6eaf0',
              borderRadius: '8px',
              padding: '9px 15px',
              fontSize: '13px',
              fontWeight: 650,
              cursor: 'pointer'
            }}
          >
            ← Anterior
          </button>
          <button
            onClick={handleNext}
            style={{
              background: 'white',
              border: '1px solid #e6eaf0',
              borderRadius: '8px',
              padding: '9px 15px',
              fontSize: '13px',
              fontWeight: 650,
              cursor: 'pointer'
            }}
          >
            Siguiente →
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '20px' }}>
        <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <div style={{ fontWeight: 750, fontSize: '16px', color: '#172033' }}>Caso de prueba</div>
              <div style={{ fontSize: '12px', color: '#718096' }}>{currentCase.code} · Procesos</div>
            </div>
            <span style={{ background: '#e2e8f0', color: '#475569', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>
              En ejecucion
            </span>
          </div>

          <div style={{ display: 'grid', gap: '18px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#718096', fontWeight: 700, textTransform: 'uppercase' }}>Descripcion</div>
              <p style={{ fontSize: '14px', margin: '6px 0', color: '#334155', lineHeight: 1.5 }}>
                {currentCase.description || 'Verificar que un proceso existente pueda editarse y guardarse correctamente.'}
              </p>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#718096', fontWeight: 700, textTransform: 'uppercase' }}>Precondiciones</div>
              <p style={{ fontSize: '14px', margin: '6px 0', color: '#334155' }}>
                {currentCase.preconditions || 'Usuario autenticado con permisos de edicion y un proceso existente.'}
              </p>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#718096', fontWeight: 700, textTransform: 'uppercase' }}>Pasos</div>
              <ol style={{ margin: '8px 0 0', paddingLeft: '20px', color: '#475569', fontSize: '13px', lineHeight: '1.8' }}>
                {(currentCase.steps && currentCase.steps.length > 0 ? currentCase.steps : [
                  'Ingresar al modulo Workflow.',
                  'Seleccionar un proceso existente.',
                  'Presionar Editar.',
                  'Modificar el nombre del proceso.',
                  'Presionar Guardar.'
                ]).map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ol>
            </div>

            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '9px', border: '1px solid #e6eaf0' }}>
              <div style={{ fontSize: '12px', color: '#718096', fontWeight: 700, textTransform: 'uppercase' }}>Resultado esperado</div>
              <p style={{ fontSize: '13px', margin: '6px 0', color: '#1e293b', fontWeight: 500 }}>
                {currentCase.expected_result}
              </p>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontWeight: 750, fontSize: '16px', color: '#172033' }}>Registrar resultado</div>
            <div style={{ fontSize: '12px', color: '#718096' }}>Documenta lo ocurrido durante la ejecucion.</div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Resultado obtenido
            </label>
            <textarea
              value={actualResult}
              onChange={(e) => setActualResult(e.target.value)}
              placeholder="Describe exactamente que ocurrio..."
              style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', minHeight: '100px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Clasificacion
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
                    fontWeight: 650,
                    background: opt.bg,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <input
                    type="radio"
                    name="page-exec-result"
                    value={opt.val}
                    checked={status === opt.val}
                    onChange={() => setStatus(opt.val)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Severidad</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', fontSize: '13px' }}
              >
                <option value="NONE">No aplica</option>
                <option value="CRITICAL">Critica</option>
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Media</option>
                <option value="LOW">Baja</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Prioridad</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', fontSize: '13px' }}
              >
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
                <option value="P4">P4</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Evidencias <span style={{ fontWeight: 400, color: '#718096' }}>(Ctrl + V disponible)</span>
            </label>
            <EvidenceDropzone
              evidenceList={evidenceList}
              onChange={setEvidenceList}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Observaciones</label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Informacion adicional sobre la prueba..."
              style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', minHeight: '60px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '9px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => showToast('Resultado guardado como borrador')}
              style={{
                background: 'white',
                border: '1px solid #e6eaf0',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 650,
                cursor: 'pointer'
              }}
            >
              Guardar borrador
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveResult}
              style={{
                background: '#14b8a6',
                color: 'white',
                border: 0,
                borderRadius: '8px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 650,
                cursor: 'pointer'
              }}
            >
              {isSaving ? 'Guardando...' : '✓ Guardar resultado'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
''')
