with open('frontend/src/pages/AIGeneratorPage.tsx', 'w', encoding='utf-8') as f:
    f.write('''import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AIGenerateResponse, AIGeneratedCase } from '../types';

export const AIGeneratorPage: React.FC = () => {
  const { showToast } = useAuth();
  const [sourceTab, setSourceTab] = useState<'manual' | 'jira'>('manual');
  
  const [title, setTitle] = useState('Crear y editar procesos BPMN');
  const [storyText, setStoryText] = useState('Como administrador quiero crear y editar procesos BPMN para poder gestionar los flujos de trabajo de la entidad.');
  const [criteria, setCriteria] = useState('1. El usuario debe poder crear un proceso.\\n2. El nombre del proceso es obligatorio.\\n3. El sistema debe validar campos requeridos.\\n4. El usuario debe poder editar un proceso existente.\\n5. El sistema debe mostrar confirmacion al guardar.');
  const [jiraKey, setJiraKey] = useState('GEST-124');
  const [additionalContext, setAdditionalContext] = useState('');
  
  const [testTypes, setTestTypes] = useState({
    positive: true,
    negative: true,
    validation: true,
    boundary: true,
    security: false,
    integration: false
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [stepMessage, setStepMessage] = useState('');
  const [generatedResult, setGeneratedResult] = useState<AIGenerateResponse | null>(null);
  const [casesList, setCasesList] = useState<AIGeneratedCase[]>([]);

  const handleJiraImport = async () => {
    try {
      showToast('Conectando a Jira para importar ' + jiraKey + '...');
      const data = await api.get<any>('/jira/issues/' + jiraKey);
      setTitle(data.title);
      setStoryText(data.story_text);
      if (data.acceptance_criteria) {
        setCriteria(data.acceptance_criteria.join('\\n'));
      }
      setSourceTab('manual');
      showToast('H.U. ' + jiraKey + ' cargada desde Jira ✓');
    } catch (err: any) {
      showToast('Error al conectar con Jira: ' + err.message);
    }
  };

  const generateCases = async () => {
    setIsGenerating(true);
    setGeneratedResult(null);

    const steps = [
      'Analizando Historia de Usuario...',
      'Identificando requerimientos y criterios...',
      'Generando escenarios positivos...',
      'Generando escenarios negativos...',
      'Generando casos de prueba en bordes...',
      'Preparando casos de prueba para revision...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setStepMessage(steps[i]);
      await new Promise(r => setTimeout(r, 250));
    }

    try {
      const activeTypes = Object.entries(testTypes)
        .filter(([_, checked]) => checked)
        .map(([key]) => key.toUpperCase());

      const res = await api.post<AIGenerateResponse>('/ai/generate', {
        project_id: 1,
        title,
        story_text: storyText,
        acceptance_criteria: criteria.split('\\n').filter(c => c.trim()),
        business_rules: additionalContext,
        test_types: activeTypes,
        detail_level: 'HIGH'
      });

      setGeneratedResult(res);
      setCasesList(res.test_cases);
      showToast(res.test_cases.length + ' casos generados exitosamente ✓');
    } catch (err: any) {
      showToast('Error en la generacion: ' + err.message);
    } finally {
      setIsGenerating(false);
      setStepMessage('');
    }
  };

  const handleApproveAll = async () => {
    if (!generatedResult || casesList.length === 0) return;
    try {
      await api.post('/ai/approve', {
        project_id: 1,
        user_story_id: generatedResult.user_story_id,
        cases: casesList.map(c => ({
          title: c.title,
          preconditions: c.preconditions,
          steps: c.steps,
          expected_result: c.expected_result,
          priority: c.priority,
          tags: ['IA-Generado']
        }))
      });
      showToast(casesList.length + ' casos agregados al catalogo ✓');
      setCasesList([]);
      setGeneratedResult(null);
    } catch (err: any) {
      showToast('Error al aprobar: ' + err.message);
    }
  };

  const handleDeleteCase = (index: number) => {
    setCasesList(casesList.filter((_, idx) => idx !== index));
    showToast('Caso descartado');
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1500px', margin: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Inteligencia artificial
          </div>
          <h1 style={{ fontSize: '27px', margin: '5px 0', fontWeight: 800, color: '#172033' }}>
            Generador de casos de prueba
          </h1>
          <div style={{ color: '#718096', fontSize: '14px' }}>
            Proporciona una H.U. manualmente o importa una H.U. desde Jira y genera casos de prueba automaticamente.
          </div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '999px', background: '#ecfeff', color: '#0f766e', fontSize: '12px', fontWeight: 750 }}>
          ✦ IA QA Assistant
        </span>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #0f766e, #0f4c5c)', color: 'white', borderRadius: '13px', padding: '22px', boxShadow: '0 8px 28px rgba(23,32,51,.07)', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '20px' }}>Convierte una Historia de Usuario en casos de prueba</h2>
        <p style={{ margin: 0, color: '#d9fffa', fontSize: '13px', lineHeight: 1.5 }}>
          La IA analiza el objetivo, criterios de aceptacion, reglas de negocio y escenarios de la H.U. para proponer pruebas positivas, negativas, de validacion y casos borde.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px' }}>
        <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '22px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            <button
              onClick={() => setSourceTab('manual')}
              style={{
                padding: '9px 15px',
                border: '1px solid #e6eaf0',
                background: sourceTab === 'manual' ? '#ecfeff' : '#fff',
                borderColor: sourceTab === 'manual' ? '#99f6e4' : '#e6eaf0',
                color: sourceTab === 'manual' ? '#0f766e' : '#334155',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ✎ H.U. manual
            </button>
            <button
              onClick={() => setSourceTab('jira')}
              style={{
                padding: '9px 15px',
                border: '1px solid #e6eaf0',
                background: sourceTab === 'jira' ? '#ecfeff' : '#fff',
                borderColor: sourceTab === 'jira' ? '#99f6e4' : '#e6eaf0',
                color: sourceTab === 'jira' ? '#0f766e' : '#334155',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ◆ Jira
            </button>
          </div>

          {sourceTab === 'manual' ? (
            <div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Titulo de la H.U.</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Como administrador quiero crear un proceso..."
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Historia de Usuario</label>
                <textarea
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', fontSize: '13px', minHeight: '110px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Criterios de aceptacion</label>
                <textarea
                  value={criteria}
                  onChange={(e) => setCriteria(e.target.value)}
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', fontSize: '13px', minHeight: '120px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          ) : (
            <div>
              <div style={{ background: '#f8fafc', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '11px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0f2fe', color: '#0369a1', display: 'grid', placeItems: 'center', fontSize: '18px', fontWeight: 800 }}>
                      ◆
                    </div>
                    <div>
                      <b style={{ color: '#0f172a' }}>Jira conectado</b>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>gestadoc.atlassian.net</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                    Conectado
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Clave de la H.U. en Jira</label>
                <input
                  value={jiraKey}
                  onChange={(e) => setJiraKey(e.target.value)}
                  placeholder="Ej. GEST-124"
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="button"
                onClick={handleJiraImport}
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
                ↥ Cargar H.U. desde Jira
              </button>

              <div style={{ marginTop: '15px', padding: '12px', borderRadius: '9px', background: '#eff6ff', color: '#1e40af', fontSize: '12px' }}>
                La integracion puede leer titulo, descripcion y criterios de la H.U.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '9px', marginTop: '20px' }}>
            <button
              onClick={() => showToast('H.U. guardada como borrador')}
              style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: 650, cursor: 'pointer' }}
            >
              Guardar H.U.
            </button>
            <button
              onClick={generateCases}
              disabled={isGenerating}
              style={{ background: '#14b8a6', color: 'white', border: 0, borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 650, cursor: 'pointer' }}
            >
              ✦ Generar casos con IA
            </button>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '22px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontWeight: 750, fontSize: '16px', color: '#172033' }}>Configuracion de generacion</div>
            <div style={{ fontSize: '12px', color: '#718096' }}>Define que debe producir la IA.</div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>Tipos de prueba</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={testTypes.positive}
                  onChange={(e) => setTestTypes({ ...testTypes, positive: e.target.checked })}
                />
                Positivos
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={testTypes.negative}
                  onChange={(e) => setTestTypes({ ...testTypes, negative: e.target.checked })}
                />
                Negativos
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={testTypes.validation}
                  onChange={(e) => setTestTypes({ ...testTypes, validation: e.target.checked })}
                />
                Validaciones
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={testTypes.boundary}
                  onChange={(e) => setTestTypes({ ...testTypes, boundary: e.target.checked })}
                />
                Casos borde
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Detalle</label>
            <select style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', fontSize: '13px' }}>
              <option>Alta — recomendado</option>
              <option>Medio</option>
              <option>Breve</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Contexto adicional para la IA</label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Reglas de negocio, restricciones o informacion..."
              style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', fontSize: '13px', minHeight: '90px', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '24px', marginTop: '22px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontWeight: 750, fontSize: '16px', color: '#172033' }}>Casos de prueba generados</div>
            <div style={{ fontSize: '12px', color: '#718096' }}>La IA propondra los casos antes de guardarlos en el catalogo.</div>
          </div>
          <span style={{ background: '#ecfeff', color: '#0f766e', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 750 }}>
            {casesList.length} casos pendientes
          </span>
        </div>

        {isGenerating && (
          <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✦</div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f766e' }}>{stepMessage}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Analizando y estructurando casos de prueba...</div>
          </div>
        )}

        {!isGenerating && casesList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px', color: '#718096' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px', color: '#14b8a6' }}>✦</div>
            <b style={{ fontSize: '15px', color: '#1e293b' }}>Aun no hay casos generados</b>
            <div style={{ marginTop: '6px', fontSize: '13px' }}>Carga una H.U. y presiona <b>Generar casos con IA</b>.</div>
          </div>
        )}

        {!isGenerating && casesList.length > 0 && (
          <div>
            {casesList.map((c, idx) => (
              <div key={idx} style={{ border: '1px solid #e6eaf0', borderRadius: '10px', padding: '16px', marginTop: '12px', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div>
                    <b style={{ color: '#0f172a', fontSize: '14px' }}>
                      {c.temp_code || ('CP-IA-' + (idx + 1))} — {c.title}
                    </b>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      <b>Resultado esperado:</b> {c.expected_result}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 9px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 750,
                    background: c.test_type === 'POSITIVE' ? '#dcfce7' : c.test_type === 'NEGATIVE' ? '#fee2e2' : '#fef3c7',
                    color: c.test_type === 'POSITIVE' ? '#15803d' : c.test_type === 'NEGATIVE' ? '#b91c1c' : '#a16207'
                  }}>
                    {c.test_type}
                  </span>
                </div>

                {c.steps && c.steps.length > 0 && (
                  <ol style={{ margin: '8px 0 0', paddingLeft: '20px', color: '#475569', fontSize: '12px', lineHeight: 1.7 }}>
                    {c.steps.map((s, stepIdx) => (
                      <li key={stepIdx}>{s}</li>
                    ))}
                  </ol>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                  <button
                    onClick={() => handleDeleteCase(idx)}
                    style={{ background: 'none', border: 0, color: '#be123c', fontSize: '12px', fontWeight: 650, cursor: 'pointer' }}
                  >
                    🗑 Eliminar
                  </button>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
              <button
                onClick={() => { setCasesList([]); showToast('Casos descartados'); }}
                style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: 650, cursor: 'pointer' }}
              >
                Descartar
              </button>
              <button
                onClick={handleApproveAll}
                style={{ background: '#14b8a6', color: 'white', border: 0, borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 650, cursor: 'pointer' }}
              >
                ✓ Aprobar y agregar al catalogo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
''')
