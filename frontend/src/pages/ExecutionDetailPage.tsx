import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ExecutionDetail } from '../types';
import { useAuth } from '../context/AuthContext';

export const ExecutionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useAuth();
  const [execution, setExecution] = useState<ExecutionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishModalOpen, setFinishModalOpen] = useState(false);

  const loadExecution = async () => {
    try {
      setLoading(true);
      const res = await api.get<ExecutionDetail>(`/executions/${id}`);
      setExecution(res);
    } catch (err: any) {
      showToast('Error al cargar detalle de ejecución: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExecution();
  }, [id]);

  const handleFinish = async () => {
    if (!execution) return;
    try {
      await api.post(`/executions/${id}/finish`, {});
      showToast('Ejecución finalizada ✓');
      setFinishModalOpen(false);
      loadExecution();
    } catch (err: any) {
      showToast('Error al finalizar: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
        Cargando detalle de la ejecución...
      </div>
    );
  }

  if (!execution) {
    return (
      <div style={{ padding: '36px', textAlign: 'center', color: '#be123c' }}>
        Ejecución no encontrada.
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontWeight: 750, fontSize: '11px' }}>🟢 PASÓ</span>;
      case 'BUG':
        return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '4px', fontWeight: 750, fontSize: '11px' }}>🔴 BUG</span>;
      case 'IMPROVEMENT':
        return <span style={{ background: '#fef3c7', color: '#a16207', padding: '3px 8px', borderRadius: '4px', fontWeight: 750, fontSize: '11px' }}>🟡 MEJORA</span>;
      case 'BLOCKED':
        return <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '3px 8px', borderRadius: '4px', fontWeight: 750, fontSize: '11px' }}>🟣 BLOQUEADO</span>;
      case 'IN_PROGRESS':
        return <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontWeight: 750, fontSize: '11px' }}>⚡ EN EJECUCIÓN</span>;
      default:
        return <span style={{ background: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: '4px', fontWeight: 750, fontSize: '11px' }}>⚪ PENDIENTE</span>;
    }
  };

  return (
    <div style={{ width: '100%', padding: '20px 24px 36px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <button
            onClick={() => navigate('/executions')}
            style={{ background: 'none', border: 0, color: '#0f766e', fontWeight: 700, fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '6px' }}
          >
            ← Volver a ejecuciones
          </button>
          <h1 style={{ fontSize: '26px', margin: '4px 0', fontWeight: 800, color: '#172033' }}>
            {execution.name}
          </h1>
          <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '6px' }}>
            {execution.project_name || 'GESTADOC'} · {execution.version} · Ambiente: <b>{execution.environment}</b>
          </div>
          {execution.user_stories && execution.user_stories.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Historias de usuario:</span>
              {execution.user_stories.map((us: any) => (
                <button
                  key={us.id}
                  onClick={() => navigate(`/user-stories/${us.id}`)}
                  style={{
                    background: '#ecfeff',
                    border: '1px solid #a5f3fc',
                    color: '#0f766e',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title={us.title}
                >
                  📖 {us.code}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {execution.status !== 'FINALIZADA' && (
            <>
              <button
                onClick={() => navigate(`/execute-test?execution_id=${execution.id}`)}
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
                ▶ Continuar ejecución
              </button>
              <button
                onClick={() => setFinishModalOpen(true)}
                style={{
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  fontWeight: 650,
                  fontSize: '13px',
                  cursor: 'pointer',
                  color: '#15803d'
                }}
              >
                ✓ Finalizar ejecución
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tarjeta de Metadatos y Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Casos</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>{execution.total_cases}</div>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#15803d', textTransform: 'uppercase', fontWeight: 700 }}>Pasó</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>{execution.passed_count}</div>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#b91c1c', textTransform: 'uppercase', fontWeight: 700 }}>Bugs</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>{execution.bugs_count}</div>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#a16207', textTransform: 'uppercase', fontWeight: 700 }}>Mejoras</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#a16207', marginTop: '4px' }}>{execution.improvements_count}</div>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Pendientes</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#64748b', marginTop: '4px' }}>{execution.pending_count}</div>
        </div>
      </div>

      {/* Tabla de Casos Ordenados */}
      <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '20px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#172033', margin: 0 }}>
            Casos de prueba en esta ejecución ({execution.cases.length})
          </h2>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Progreso general: <b>{execution.progress_percentage}%</b> ({execution.executed_count} de {execution.total_cases})
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e6eaf0', textAlign: 'left', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                <th style={{ padding: '12px', width: '50px' }}>#</th>
                <th style={{ padding: '12px', width: '110px' }}>Código</th>
                <th style={{ padding: '12px' }}>Caso de prueba</th>
                <th style={{ padding: '12px', width: '130px' }}>Historia de usuario</th>
                <th style={{ padding: '12px' }}>Módulo</th>
                <th style={{ padding: '12px' }}>Prioridad</th>
                <th style={{ padding: '12px' }}>Estado</th>
                <th style={{ padding: '12px' }}>Resultado obtenido / Observaciones</th>
                <th style={{ padding: '12px', width: '100px', textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {execution.cases.map((c, idx) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #e6eaf0' }}>
                  <td style={{ padding: '12px', color: '#94a3b8', fontWeight: 600 }}>
                    {String(idx + 1).padStart(2, '0')}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#0f766e' }}>
                    {c.code}
                  </td>
                  <td style={{ padding: '12px', color: '#1e293b' }}>
                    <b>{c.title}</b>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {c.user_story_code ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/user-stories/${c.user_story_id}`)}
                        style={{
                          background: '#ecfeff',
                          color: '#0f766e',
                          border: '1px solid #a5f3fc',
                          borderRadius: '6px',
                          padding: '2px 7px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title={c.user_story_title}
                      >
                        📖 {c.user_story_code}
                      </button>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>Sin asignar</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', color: '#64748b' }}>
                    {c.module_name || '—'}
                  </td>
                  <td style={{ padding: '12px' }}>
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
                  </td>
                  <td style={{ padding: '12px' }}>
                    {getStatusBadge(c.status)}
                  </td>
                  <td style={{ padding: '12px', color: '#475569', fontSize: '12px', maxWidth: '300px' }}>
                    {c.actual_result ? (
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.actual_result}
                      </div>
                    ) : c.observations ? (
                      <div style={{ fontStyle: 'italic', color: '#64748b' }}>{c.observations}</div>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                    {c.evidences && c.evidences.length > 0 && (
                      <div style={{ color: '#0f766e', fontWeight: 600, fontSize: '11px', marginTop: '3px' }}>
                        📎 {c.evidences.length} evidencia(s)
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => navigate(`/execute-test?execution_id=${execution.id}&case_id=${c.test_case_id}`)}
                      style={{
                        background: '#f0fdfa',
                        border: '1px solid #99f6e4',
                        color: '#0f766e',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: 650,
                        cursor: 'pointer'
                      }}
                    >
                      {c.status === 'NOT_EXECUTED' ? '▶ Ejecutar' : '✏ Ver / Editar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Finalizar */}
      {finishModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '480px', maxWidth: '100%', padding: '26px', boxShadow: '0 20px 40px rgba(0,0,0,.2)' }}>
            <h2 style={{ margin: '0 0 10px', fontSize: '19px', fontWeight: 800, color: '#172033' }}>
              Finalizar Ejecución
            </h2>
            <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 16px', lineHeight: 1.5 }}>
              ¿Estás seguro de finalizar la ejecución <b>{execution.name}</b>?
            </p>

            {execution.pending_count > 0 ? (
              <div style={{ background: '#fef3c7', border: '1px solid #fde047', borderRadius: '8px', padding: '12px 14px', marginBottom: '18px', fontSize: '13px', color: '#92400e' }}>
                ⚠️ <b>Atención:</b> Hay <b>{execution.pending_count}</b> casos de prueba sin ejecutar.
              </div>
            ) : (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px 14px', marginBottom: '18px', fontSize: '13px', color: '#065f46' }}>
                ✓ Todos los casos de prueba de esta ejecución han sido completados.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setFinishModalOpen(false)}
                style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleFinish}
                style={{ background: '#15803d', color: 'white', border: 0, borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Confirmar y finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
