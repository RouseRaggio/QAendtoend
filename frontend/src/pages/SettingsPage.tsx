import React from 'react';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div style={{ width: '100%', padding: '20px 24px 36px', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '22px' }}>
        <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Sistema
        </div>
        <h1 style={{ fontSize: '27px', margin: '5px 0', fontWeight: 800, color: '#172033' }}>
          Configuración
        </h1>
        <div style={{ color: '#718096', fontSize: '14px' }}>
          Preferencias generales de TestFlow QA.
        </div>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 750 }}>Información del perfil</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Nombre</label>
              <input value={user?.full_name || 'Rouse'} readOnly style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', background: '#f8fafc', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Correo</label>
              <input value={user?.email || 'qa@gestadoc.com'} readOnly style={{ width: '100%', border: '1px solid #e6eaf0', borderRadius: '8px', padding: '10px', background: '#f8fafc', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 750 }}>Integraciones de IA y Jira</h3>
          <div style={{ display: 'grid', gap: '12px', fontSize: '13px' }}>
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e6eaf0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b>Proveedor de IA: Mock Determinístico / OpenAI / Ollama</b>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Activo: MockAIProvider (generación automática estructurada con Pydantic)</div>
              </div>
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>Activo</span>
            </div>
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e6eaf0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b>Jira REST API: gestadoc.atlassian.net</b>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Soporta importación de historias como GEST-124</div>
              </div>
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>Conectado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
