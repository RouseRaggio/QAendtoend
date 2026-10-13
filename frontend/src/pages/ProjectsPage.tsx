import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Project } from '../types';
import { useAuth } from '../context/AuthContext';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');

  const loadProjects = () => {
    setLoading(true);
    api.get<Project[]>('/projects')
      .then(res => setProjects(res))
      .catch(err => showToast('Error al cargar proyectos: ' + err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/projects', { name, key: key.toUpperCase(), description });
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
    <div style={{ width: '100%', padding: '20px 24px 36px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Navegación & Estructura
          </div>
          <h1 style={{ fontSize: '27px', margin: '5px 0', fontWeight: 800, color: '#172033' }}>
            Proyectos
          </h1>
          <div style={{ color: '#718096', fontSize: '14px' }}>
            Selecciona un proyecto para gestionar sus Historias de Usuario, casos de prueba y ciclo de ejecución.
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            background: '#14b8a6',
            color: 'white',
            border: 0,
            borderRadius: '8px',
            padding: '10px 18px',
            fontWeight: 650,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(20,184,166,0.2)'
          }}
        >
          ＋ Nuevo proyecto
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Cargando proyectos...
        </div>
      ) : projects.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '48px 24px',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px dashed #cbd5e1'
        }}>
          <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '18px' }}>No hay proyectos registrados</h3>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px' }}>Crea tu primer proyecto para comenzar a organizar pruebas por Historias de Usuario.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              background: '#14b8a6',
              color: 'white',
              border: 0,
              borderRadius: '8px',
              padding: '10px 18px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Crear proyecto ahora
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {projects.map(p => (
            <div
              key={p.id}
              style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '22px',
                boxShadow: '0 4px 16px rgba(15,23,42,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      fontFamily: 'monospace'
                    }}>
                      {p.key}
                    </span>
                    <b style={{ fontSize: '18px', color: '#0f172a' }}>{p.name}</b>
                  </div>
                  <span style={{
                    background: p.status === 'ACTIVE' ? '#dcfce7' : '#e2e8f0',
                    color: p.status === 'ACTIVE' ? '#15803d' : '#475569',
                    padding: '4px 8px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {p.status === 'ACTIVE' ? 'Activo' : 'En configuración'}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: '#64748b', margin: '8px 0 16px', minHeight: '38px', lineHeight: 1.5 }}>
                  {p.description || 'Sin descripción del proyecto.'}
                </p>

                {/* Metrics */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  background: '#f8fafc',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  border: '1px solid #f1f5f9'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                      {p.user_stories_count ?? 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Historias</div>
                  </div>
                  <div style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f766e' }}>
                      {p.test_cases_count ?? 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Casos QA</div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => navigate(`/projects/${p.id}/user-stories`)}
                  style={{
                    flex: 1,
                    background: '#0f766e',
                    color: 'white',
                    border: 0,
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Abrir proyecto</span>
                  <span style={{ fontSize: '15px' }}>→</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: 'min(500px, 100%)', borderRadius: '12px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Crear nuevo proyecto</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>Nombre del Proyecto</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej. GESTADOC"
                  required
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', boxSizing: 'border-box', fontSize: '14px' }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>Clave (Prefijo de casos/historias)</label>
                <input
                  value={key}
                  onChange={e => setKey(e.target.value.toUpperCase())}
                  placeholder="Ej. GEST"
                  required
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', boxSizing: 'border-box', fontSize: '14px', textTransform: 'uppercase' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>Descripción</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Descripción del sistema y alcance de pruebas..."
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', minHeight: '80px', boxSizing: 'border-box', fontSize: '14px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 14px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: '#14b8a6', color: 'white', border: 0, borderRadius: '8px', padding: '9px 16px', fontWeight: 700, cursor: 'pointer' }}
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
export default ProjectsPage;
