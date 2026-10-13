with open('frontend/src/pages/DashboardPage.tsx', 'w', encoding='utf-8') as f:
    f.write('''import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DashboardMetrics, TestCase } from '../types';
import { ResultModal } from '../components/ResultModal';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [m, tc] = await Promise.all([
        api.get<DashboardMetrics>('/dashboard/metrics'),
        api.get<TestCase[]>('/test-cases?project_id=1')
      ]);
      setMetrics(m);
      setTestCases(tc);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !metrics) {
    return <div style={{ padding: '28px', color: '#64748b' }}>Cargando panel de calidad...</div>;
  }

  const passPct = metrics.total_test_cases > 0
    ? Math.round((metrics.passed / metrics.total_test_cases) * 100)
    : 0;

  return (
    <div style={{ padding: '28px', maxWidth: '1500px', margin: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Proyecto activo · {metrics.active_project_name}
          </div>
          <h1 style={{ fontSize: '27px', margin: '5px 0', fontWeight: 800, color: '#172033' }}>
            Dashboard QA
          </h1>
          <div style={{ color: '#718096', fontSize: '14px' }}>
            Resumen de la ejecucion: {metrics.active_execution_name || 'Pruebas funcionales — Workflow'}
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsModalOpen(true)}
          style={{
            background: '#14b8a6',
            color: 'white',
            border: 0,
            borderRadius: '8px',
            padding: '10px 16px',
            fontWeight: 650,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(20, 184, 166, 0.25)'
          }}
        >
          ＋ Registrar resultado
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
        <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '18px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#718096', fontSize: '12px', fontWeight: 600 }}>
            <span>Pruebas ejecutadas</span>
            <div style={{ width: '35px', height: '35px', borderRadius: '9px', display: 'grid', placeItems: 'center', background: '#ecfeff', color: '#0f766e', fontWeight: 700 }}>
              ✓
            </div>
          </div>
          <div style={{ fontSize: '27px', fontWeight: 800, marginTop: '8px', color: '#172033' }}>
            {metrics.executed_tests}
          </div>
          <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
            de {metrics.total_test_cases} casos
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '18px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#718096', fontSize: '12px', fontWeight: 600 }}>
            <span>Correctas</span>
            <div style={{ width: '35px', height: '35px', borderRadius: '9px', display: 'grid', placeItems: 'center', background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
              ✓
            </div>
          </div>
          <div style={{ fontSize: '27px', fontWeight: 800, marginTop: '8px', color: '#172033' }}>
            {metrics.passed}
          </div>
          <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
            {metrics.pass_pct}% del total
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '18px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#718096', fontSize: '12px', fontWeight: 600 }}>
            <span>Bugs encontrados</span>
            <div style={{ width: '35px', height: '35px', borderRadius: '9px', display: 'grid', placeItems: 'center', background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>
              !
            </div>
          </div>
          <div style={{ fontSize: '27px', fontWeight: 800, marginTop: '8px', color: '#172033' }}>
            {metrics.bugs}
          </div>
          <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
            {metrics.high_severity_bugs_count} de severidad alta
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '18px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#718096', fontSize: '12px', fontWeight: 600 }}>
            <span>Mejoras</span>
            <div style={{ width: '35px', height: '35px', borderRadius: '9px', display: 'grid', placeItems: 'center', background: '#fef3c7', color: '#a16207', fontWeight: 700 }}>
              ★
            </div>
          </div>
          <div style={{ fontSize: '27px', fontWeight: 800, marginTop: '8px', color: '#172033' }}>
            {metrics.improvements}
          </div>
          <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
            {metrics.pending_improvements_count} pendientes
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '18px', marginTop: '18px' }}>
        <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '20px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <div style={{ fontWeight: 750, fontSize: '16px', color: '#172033' }}>Progreso de la ejecucion</div>
              <div style={{ fontSize: '12px', color: '#718096' }}>
                {metrics.executed_tests} de {metrics.total_test_cases} pruebas procesadas
              </div>
            </div>
            <strong style={{ fontSize: '20px', color: '#0f766e' }}>{passPct}%</strong>
          </div>
          <div style={{ height: '8px', background: '#edf2f7', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#14b8a6', width: ${passPct}% }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            <span>🟢 {metrics.passed} Pasaron</span>
            <span>🔴 {metrics.bugs} Bugs</span>
            <span>🟡 {metrics.improvements} Mejoras</span>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '20px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontWeight: 750, fontSize: '16px', color: '#172033' }}>Distribucion</div>
            <div style={{ fontSize: '12px', color: '#718096' }}>Resultados registrados</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '26px', padding: '10px 0' }}>
            <div style={{
              width: '105px',
              height: '105px',
              borderRadius: '50%',
              background: conic-gradient(#10b981 0% %, #ef4444 % %, #f59e0b % 100%),
              display: 'grid',
              placeItems: 'center'
            }}>
              <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'white', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '18px' }}>
                {metrics.total_test_cases}
              </div>
            </div>
            <div style={{ fontSize: '12px', lineHeight: '2.1' }}>
              <div>🟢 Pasó <b>{metrics.passed}</b></div>
              <div>🔴 Bug <b>{metrics.bugs}</b></div>
              <div>🟡 Mejora <b>{metrics.improvements}</b></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '20px', marginTop: '18px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <div style={{ fontWeight: 750, fontSize: '16px', color: '#172033' }}>Ultimos resultados</div>
            <div style={{ fontSize: '12px', color: '#718096' }}>Actividad reciente de la ejecucion</div>
          </div>
          <button
            onClick={() => navigate('/executions')}
            style={{
              background: 'white',
              border: '1px solid #e6eaf0',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 650,
              cursor: 'pointer'
            }}
          >
            Ver todos
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e6eaf0', textAlign: 'left', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                <th style={{ padding: '12px' }}>Codigo</th>
                <th style={{ padding: '12px' }}>Caso de prueba</th>
                <th style={{ padding: '12px' }}>Modulo</th>
                <th style={{ padding: '12px' }}>Resultado</th>
                <th style={{ padding: '12px' }}>Severidad</th>
                <th style={{ padding: '12px' }}>Evidencias</th>
                <th style={{ padding: '12px' }}>Accion</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recent_results.slice(0, 6).map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #e6eaf0' }}>
                  <td style={{ padding: '12px', fontWeight: 700 }}>{r.test_case_code || ('WF-' + r.test_case_id)}</td>
                  <td style={{ padding: '12px', color: '#1e293b' }}>{r.test_case_title}</td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{r.module_name || 'Procesos'}</td>
                  <td style={{ padding: '12px' }}>
                    {r.status === 'PASSED' && (
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 750 }}>
                        PASÓ
                      </span>
                    )}
                    {r.status === 'BUG' && (
                      <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 750 }}>
                        BUG
                      </span>
                    )}
                    {r.status === 'IMPROVEMENT' && (
                      <span style={{ background: '#fef3c7', color: '#a16207', padding: '4px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 750 }}>
                        MEJORA
                      </span>
                    )}
                    {r.status === 'BLOCKED' && (
                      <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '4px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 750 }}>
                        BLOQUEADO
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {r.severity !== 'NONE' ? (
                      <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                        {r.severity}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '12px', color: '#64748b' }}>
                    {r.evidences.length > 0 ? ('📎 ' + r.evidences.length) : '—'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => navigate('/execute-test')}
                      style={{ background: 'none', border: 0, color: '#0f766e', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ResultModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        testCases={testCases}
        activeExecutionId={metrics.active_execution_id || 1}
      />
    </div>
  );
};
''')
