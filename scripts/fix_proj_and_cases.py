with open('frontend/src/pages/ProjectsPage.tsx', 'w', encoding='utf-8') as f:
    f.write('''import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Project } from '../types';
import { useAuth } from '../context/AuthContext';

export const ProjectsPage: React.FC = () => {
  const { showToast } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');

  const loadProjects = () => {
    api.get<Project[]>('/projects').then(res => setProjects(res));
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/projects', { name, key, description });
      showToast('Proyecto creado exitosamente ✓');
      setIsModalOpen(false);
      setName('');
      setKey('');
      setDescription('');
      loadProjects();
    } catch (err: any) {
      showToast('Error al crear: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1500px', margin: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Organización
          </div>
          <h1 style={{ fontSize: '27px', margin: '5px 0', fontWeight: 800, color: '#172033' }}>
            Proyectos
          </h1>
          <div style={{ color: '#718096', fontSize: '14px' }}>
            Gestiona tus productos y aplicaciones bajo prueba.
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
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
          ＋ Nuevo proyecto
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
        {projects.map(p => (
          <div
            key={p.id}
            style={{
              background: 'white',
              border: '1px solid #e6eaf0',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 8px 28px rgba(23,32,51,.07)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <b style={{ fontSize: '17px', color: '#0f172a' }}>{p.name}</b>
              <span style={{
                background: p.status === 'ACTIVE' ? '#dcfce7' : '#e2e8f0',
                color: p.status === 'ACTIVE' ? '#15803d' : '#475569',
                padding: '4px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 750
              }}>
                {p.status === 'ACTIVE' ? 'Activo' : 'En configuración'}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '8px 0 16px', minHeight: '38px' }}>
              {p.description || 'Sin descripción'}
            </p>
            <div style={{ fontSize: '12px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
              {p.modules_count} módulos · {p.test_cases_count} casos de prueba
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: 'min(500px, 100%)', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700 }}>Crear nuevo proyecto</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Nombre</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej. GESTADOC"
                  required
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Clave</label>
                <input
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  placeholder="Ej. GEST"
                  required
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Descripción</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Descripción del proyecto..."
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', minHeight: '80px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '9px 14px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: '#14b8a6', color: 'white', border: 0, borderRadius: '8px', padding: '9px 16px', fontWeight: 650, cursor: 'pointer' }}
                >
                  Crear proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
''')

with open('frontend/src/pages/TestCasesPage.tsx', 'w', encoding='utf-8') as f:
    f.write('''import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { TestCase } from '../types';
import { useAuth } from '../context/AuthContext';

export const TestCasesPage: React.FC = () => {
  const { showToast } = useAuth();
  const [cases, setCases] = useState<TestCase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [preconditions, setPreconditions] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [priority, setPriority] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P2');

  const loadCases = () => {
    api.get<TestCase[]>('/test-cases?project_id=1').then(res => setCases(res));
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/test-cases', {
        project_id: 1,
        code,
        title,
        preconditions,
        expected_result: expectedResult,
        priority,
        steps: ['Paso 1: Abrir pantalla', 'Paso 2: Ejecutar acción', 'Paso 3: Validar respuesta']
      });
      showToast('Caso de prueba creado ✓');
      setIsModalOpen(false);
      setCode('');
      setTitle('');
      setPreconditions('');
      setExpectedResult('');
      loadCases();
    } catch (err: any) {
      showToast('Error al crear: ' + err.message);
    }
  };

  const filtered = cases.filter(c =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '28px', maxWidth: '1500px', margin: 'auto' }}>
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
        <button
          onClick={() => setIsModalOpen(true)}
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

      <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '20px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
        <div style={{ display: 'flex', gap: '9px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
          <input
            placeholder="🔎 Buscar por código o nombre..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '9px 12px', border: '1px solid #e6eaf0', borderRadius: '8px', outline: 'none', fontSize: '13px', minWidth: '240px' }}
          />
          <select style={{ padding: '9px 12px', border: '1px solid #e6eaf0', borderRadius: '8px', outline: 'none', fontSize: '13px' }}>
            <option>Todos los módulos</option>
            <option>Workflow</option>
            <option>Procesos</option>
            <option>FUID</option>
          </select>
          <button
            onClick={() => showToast('Importación de Excel preparada')}
            style={{
              background: 'white',
              border: '1px solid #e6eaf0',
              borderRadius: '8px',
              padding: '9px 13px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ↥ Importar Excel
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e6eaf0', textAlign: 'left', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                <th style={{ padding: '12px' }}>Código</th>
                <th style={{ padding: '12px' }}>Caso</th>
                <th style={{ padding: '12px' }}>Módulo</th>
                <th style={{ padding: '12px' }}>Precondición</th>
                <th style={{ padding: '12px' }}>Prioridad</th>
                <th style={{ padding: '12px' }}>Último resultado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #e6eaf0' }}>
                  <td style={{ padding: '12px', fontWeight: 700 }}>{c.code}</td>
                  <td style={{ padding: '12px', color: '#1e293b' }}>
                    {c.title}
                    {c.is_ai_generated && (
                      <span style={{ marginLeft: '6px', background: '#ecfeff', color: '#0f766e', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        ✦ IA
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', color: '#475569' }}>{c.module_name || 'Procesos'}</td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{c.preconditions || 'Usuario estándar'}</td>
                  <td style={{ padding: '12px', color: '#475569' }}>{c.priority}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: 'min(600px, 100%)', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700 }}>Nuevo caso de prueba</h2>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Código</label>
                  <input
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="WF-050"
                    required
                    style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Título</label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ej. Validar exportación de reportes"
                    required
                    style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Precondiciones</label>
                <input
                  value={preconditions}
                  onChange={e => setPreconditions(e.target.value)}
                  placeholder="Ej. Usuario autenticado con rol QA"
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Resultado esperado</label>
                <textarea
                  value={expectedResult}
                  onChange={e => setExpectedResult(e.target.value)}
                  placeholder="El sistema debe responder..."
                  required
                  style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', minHeight: '80px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
    </div>
  );
};
''')
