import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Topbar: React.FC = () => {
  const { user } = useAuth();

  return (
    <header style={{
      height: '68px',
      background: 'white',
      borderBottom: '1px solid #e6eaf0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      position: 'sticky',
      top: 0,
      zIndex: 30
    }}>
      <input
        style={{
          width: '330px',
          background: '#f6f8fb',
          border: '1px solid #e6eaf0',
          borderRadius: '9px',
          padding: '9px 13px',
          outline: 'none',
          fontSize: '13px'
        }}
        placeholder="Buscar casos, bugs, proyectos..."
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600 }}>
        <span>{user?.full_name || 'Rouse'}</span>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          background: '#d1fae5',
          color: '#047857',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700
        }}>
          {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'R'}
        </div>
      </div>
    </header>
  );
};
