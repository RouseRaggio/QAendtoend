import React from 'react';
import { NavLink } from 'react-router-dom';

export const Sidebar: React.FC = () => {
  return (
    <aside style={{
      width: '240px',
      background: '#102a43',
      color: '#dbeafe',
      padding: '20px 14px',
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 40
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px 25px', fontWeight: 800, fontSize: '20px', color: 'white' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#2dd4bf', display: 'grid', placeItems: 'center', color: '#083344', fontWeight: 900 }}>
          ✓
        </div>
        <span>TestFlow QA</span>
      </div>

      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#91a7bf', padding: '15px 12px 7px', letterSpacing: '.08em', fontWeight: 700 }}>
        Principal
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <NavLink
          to="/"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '11px',
            color: isActive ? '#fff' : '#c9d8e8',
            textDecoration: 'none',
            padding: '11px 12px',
            borderRadius: '9px',
            fontSize: '14px',
            fontWeight: 500,
            background: isActive ? 'rgba(45,212,191,.14)' : 'transparent'
          })}
        >
          <span>▦</span> <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/projects"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '11px',
            color: isActive ? '#fff' : '#c9d8e8',
            textDecoration: 'none',
            padding: '11px 12px',
            borderRadius: '9px',
            fontSize: '14px',
            fontWeight: 500,
            background: isActive ? 'rgba(45,212,191,.14)' : 'transparent'
          })}
        >
          <span>▣</span> <span>Proyectos</span>
        </NavLink>

        <NavLink
          to="/user-stories"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '11px',
            color: isActive ? '#fff' : '#c9d8e8',
            textDecoration: 'none',
            padding: '11px 12px',
            borderRadius: '9px',
            fontSize: '14px',
            fontWeight: 500,
            background: isActive ? 'rgba(45,212,191,.14)' : 'transparent'
          })}
        >
          <span>📖</span> <span>Historias de usuario</span>
        </NavLink>

        <NavLink
          to="/executions"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '11px',
            color: isActive ? '#fff' : '#c9d8e8',
            textDecoration: 'none',
            padding: '11px 12px',
            borderRadius: '9px',
            fontSize: '14px',
            fontWeight: 500,
            background: isActive ? 'rgba(45,212,191,.14)' : 'transparent'
          })}
        >
          <span>▶</span> <span>Ejecuciones</span>
        </NavLink>


        <NavLink
          to="/incidents"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '11px',
            color: isActive ? '#fff' : '#c9d8e8',
            textDecoration: 'none',
            padding: '11px 12px',
            borderRadius: '9px',
            fontSize: '14px',
            fontWeight: 500,
            background: isActive ? 'rgba(45,212,191,.14)' : 'transparent'
          })}
        >
          <span>⚠</span> <span>Incidencias</span>
        </NavLink>

        <NavLink
          to="/reports"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '11px',
            color: isActive ? '#fff' : '#c9d8e8',
            textDecoration: 'none',
            padding: '11px 12px',
            borderRadius: '9px',
            fontSize: '14px',
            fontWeight: 500,
            background: isActive ? 'rgba(45,212,191,.14)' : 'transparent'
          })}
        >
          <span>▤</span> <span>Reportes</span>
        </NavLink>
      </nav>

      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#91a7bf', padding: '20px 12px 7px', letterSpacing: '.08em', fontWeight: 700 }}>
        Configuración
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <NavLink
          to="/settings"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '11px',
            color: isActive ? '#fff' : '#c9d8e8',
            textDecoration: 'none',
            padding: '11px 12px',
            borderRadius: '9px',
            fontSize: '14px',
            fontWeight: 500,
            background: isActive ? 'rgba(45,212,191,.14)' : 'transparent'
          })}
        >
          <span>⚙</span> <span>Configuración</span>
        </NavLink>
      </nav>

      <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: '15px' }}>
        <div style={{ fontSize: '12px', color: '#91a7bf' }}>TestFlow QA · v1.0.0</div>
      </div>
    </aside>
  );
};
