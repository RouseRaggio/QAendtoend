import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const ReportsPage: React.FC = () => {
  const { showToast } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    showToast('Generando reporte PDF profesional...');
    try {
      // Direct download link trigger
      const link = document.createElement('a');
      link.href = '/api/v1/reports/executions/1/download-latest';
      link.setAttribute('download', 'Reporte_Pruebas_GESTADOC_v1.4.2.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Descarga iniciada ✓');
    } catch (err: any) {
      showToast('Error al descargar reporte');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ width: '100%', padding: '20px 24px 36px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Documentación
          </div>
          <h1 style={{ fontSize: '27px', margin: '5px 0', fontWeight: 800, color: '#172033' }}>
            Reportes
          </h1>
          <div style={{ color: '#718096', fontSize: '14px' }}>
            Genera informes profesionales con evidencias en PDF a partir de los resultados registrados.
          </div>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={isGenerating}
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
          {isGenerating ? 'Generando...' : '⇩ Generar PDF'}
        </button>
      </div>

      <div style={{ background: 'white', border: '1px solid #e6eaf0', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 28px rgba(23,32,51,.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontWeight: 750, fontSize: '16px', color: '#172033' }}>Vista previa del reporte</div>
            <div style={{ fontSize: '12px', color: '#718096' }}>Reporte de pruebas funcionales — Workflow</div>
          </div>
          <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 750 }}>
            Listo para generar
          </span>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e6eaf0', padding: '28px', borderRadius: '10px' }}>
          <h2 style={{ margin: '0 0 5px', fontSize: '20px', color: '#102a43' }}>REPORTE DE PRUEBAS FUNCIONALES</h2>
          <p style={{ color: '#64748b', margin: '0 0 16px', fontSize: '13px' }}>GESTADOC · Workflow · v1.4.2 · Ambiente QA</p>
          <hr style={{ border: 0, borderTop: '1px solid #e6eaf0', margin: '16px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', margin: '20px 0' }}>
            <div>
              <small style={{ color: '#64748b', fontSize: '12px' }}>Total pruebas</small>
              <h2 style={{ margin: '4px 0 0', fontSize: '24px' }}>45</h2>
            </div>
            <div>
              <small style={{ color: '#64748b', fontSize: '12px' }}>Pasaron</small>
              <h2 style={{ margin: '4px 0 0', fontSize: '24px', color: '#059669' }}>32</h2>
            </div>
            <div>
              <small style={{ color: '#64748b', fontSize: '12px' }}>Bugs</small>
              <h2 style={{ margin: '4px 0 0', fontSize: '24px', color: '#dc2626' }}>7</h2>
            </div>
            <div>
              <small style={{ color: '#64748b', fontSize: '12px' }}>Mejoras</small>
              <h2 style={{ margin: '4px 0 0', fontSize: '24px', color: '#b45309' }}>6</h2>
            </div>
          </div>

          <div style={{ background: '#ecfeff', borderLeft: '4px solid #14b8a6', padding: '12px 16px', borderRadius: '4px', fontSize: '13px', color: '#0f766e', marginTop: '16px' }}>
            <b>Conclusión ejecutiva:</b> La ejecución presenta un cumplimiento funcional del 71.1%. Se identificaron 7 incidencias (2 de severidad alta) y 6 oportunidades de mejora. Las evidencias adjuntas incluyen capturas de pantalla pegadas directamente desde el portapapeles.
          </div>
        </div>
      </div>
    </div>
  );
};
