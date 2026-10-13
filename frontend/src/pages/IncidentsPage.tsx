import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Bug, Improvement } from '../types';

export const IncidentsPage: React.FC = () => {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    Promise.all([
      api.get<Bug[]>('/incidents/bugs?project_id=1'),
      api.get<Improvement[]>('/incidents/improvements?project_id=1')
    ]).then(([b, imp]) => {
      setBugs(b);
      setImprovements(imp);
    });
  }, []);

  const highSevBugs = bugs.filter(b => b.severity === 'HIGH' || b.severity === 'CRITICAL').length;
  const pendingImps = improvements.filter(m => m.status === 'PENDING').length;

  return (
    <div style={{ width: '100%', padding: '20px 24px 36px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Seguimiento
          </div>
          <h1 style={{ fontSize: '27px', margin: '5px 0', fontWeight: 800, color: '#172033' }}>
            Incidencias
          </h1>
          <div style={{ color: '#718096', fontSize: '14px' }}>
            Bugs y mejoras detectados durante las pruebas con evidencias asociadas.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '22px' }}>
        <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '18px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#718096', fontSize: '12px', fontWeight: 600 }}>
            <span>Bugs abiertos</span>
            <div style={{ width: '35px', height: '35px', borderRadius: '9px', display: 'grid', placeItems: 'center', background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>!</div>
          </div>
          <div style={{ fontSize: '27px', fontWeight: 800, marginTop: '8px', color: '#172033' }}>{bugs.length}</div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '18px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#718096', fontSize: '12px', fontWeight: 600 }}>
            <span>Severidad alta</span>
            <div style={{ width: '35px', height: '35px', borderRadius: '9px', display: 'grid', placeItems: 'center', background: '#fff1f2', color: '#be123c', fontWeight: 700 }}>↑</div>
          </div>
          <div style={{ fontSize: '27px', fontWeight: 800, marginTop: '8px', color: '#172033' }}>{highSevBugs}</div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '18px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#718096', fontSize: '12px', fontWeight: 600 }}>
            <span>Mejoras pendientes</span>
            <div style={{ width: '35px', height: '35px', borderRadius: '9px', display: 'grid', placeItems: 'center', background: '#fef3c7', color: '#a16207', fontWeight: 700 }}>★</div>
          </div>
          <div style={{ fontSize: '27px', fontWeight: 800, marginTop: '8px', color: '#172033' }}>{pendingImps}</div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '18px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#718096', fontSize: '12px', fontWeight: 600 }}>
            <span>Total registradas</span>
            <div style={{ width: '35px', height: '35px', borderRadius: '9px', display: 'grid', placeItems: 'center', background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>✓</div>
          </div>
          <div style={{ fontSize: '27px', fontWeight: 800, marginTop: '8px', color: '#172033' }}>{bugs.length + improvements.length}</div>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '20px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
        <div style={{ display: 'flex', gap: '9px', marginBottom: '16px' }}>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ padding: '9px 12px', border: '1px solid #e6eaf0', borderRadius: '8px', outline: 'none', fontSize: '13px' }}
          >
            <option value="ALL">Todos los tipos</option>
            <option value="BUG">Solo Bugs</option>
            <option value="IMPROVEMENT">Solo Mejoras</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e6eaf0', textAlign: 'left', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                <th style={{ padding: '12px' }}>ID</th>
                <th style={{ padding: '12px' }}>Tipo</th>
                <th style={{ padding: '12px' }}>Titulo</th>
                <th style={{ padding: '12px' }}>Caso</th>
                <th style={{ padding: '12px' }}>Severidad</th>
                <th style={{ padding: '12px' }}>Evidencias</th>
                <th style={{ padding: '12px' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filterType !== 'IMPROVEMENT' && bugs.map(b => (
                <tr key={'bug-' + b.id} style={{ borderBottom: '1px solid #e6eaf0' }}>
                  <td style={{ padding: '12px', fontWeight: 700 }}>{b.code}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 750 }}>
                      BUG
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#1e293b' }}>{b.title}</td>
                  <td style={{ padding: '12px', color: '#475569' }}>{b.test_case_code || '—'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: b.severity === 'HIGH' ? '#fee2e2' : '#fef3c7', color: b.severity === 'HIGH' ? '#b91c1c' : '#a16207', padding: '3px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                      {b.severity}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#64748b' }}>
                    {b.evidences && b.evidences.length > 0 ? ('📎 ' + b.evidences.length) : '—'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: '#e2e8f0', color: '#475569', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}

              {filterType !== 'BUG' && improvements.map(m => (
                <tr key={'imp-' + m.id} style={{ borderBottom: '1px solid #e6eaf0' }}>
                  <td style={{ padding: '12px', fontWeight: 700 }}>{m.code}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: '#fef3c7', color: '#a16207', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 750 }}>
                      MEJORA
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#1e293b' }}>{m.title}</td>
                  <td style={{ padding: '12px', color: '#475569' }}>{m.test_case_code || '—'}</td>
                  <td style={{ padding: '12px', color: '#64748b' }}>Media</td>
                  <td style={{ padding: '12px', color: '#64748b' }}>
                    {m.evidences && m.evidences.length > 0 ? ('📎 ' + m.evidences.length) : '—'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: '#e2e8f0', color: '#475569', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
