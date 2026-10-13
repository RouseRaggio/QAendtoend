import React, { useState, useRef } from 'react';
import { api } from '../api/client';
import { ImportPreviewResponse, ImportCommitResponse } from '../types';
import { useAuth } from '../context/AuthContext';

interface StoryExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: number;
  storyCode: string;
  storyTitle: string;
  projectId: number;
  onSuccess: () => void;
}

export const StoryExcelImportModal: React.FC<StoryExcelImportModalProps> = ({
  isOpen,
  onClose,
  storyId,
  storyCode,
  storyTitle,
  projectId,
  onSuccess
}) => {
  const { showToast } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewResponse | null>(null);
  const [importStrategy, setImportStrategy] = useState<'SKIP' | 'UPDATE' | 'CANCEL'>('SKIP');
  const [importResult, setImportResult] = useState<ImportCommitResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setImportFile(null);
    setIsUploading(false);
    setIsCommitting(false);
    setIsDragOver(false);
    setImportPreview(null);
    setImportStrategy('SKIP');
    setImportResult(null);
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await api.getBlob(`/user-stories/${storyId}/import-cases/template`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plantilla_casos_${storyCode}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Plantilla descargada correctamente ✓');
    } catch (err: any) {
      showToast('Error al descargar plantilla: ' + err.message);
    }
  };

  const handleFileSelect = async (file: File) => {
    setErrorMessage(null);
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setErrorMessage('Por favor selecciona un archivo con formato .xlsx o .xls');
      showToast('Por favor selecciona un archivo con formato .xlsx o .xls');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('El archivo supera el tamaño máximo permitido de 10 MB.');
      showToast('El archivo supera el tamaño máximo permitido de 10 MB.');
      return;
    }

    setImportFile(file);
    setIsUploading(true);
    setImportPreview(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.postFormData<ImportPreviewResponse>(
        `/user-stories/${storyId}/import-cases/preview?project_id=${projectId}`,
        formData
      );
      setImportPreview(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el archivo Excel.');
      showToast('Error al procesar el archivo: ' + err.message);
      setImportFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importPreview) return;
    const validItems = importPreview.items.filter(it => it.status === 'VALID' || it.status === 'WARNING');
    if (validItems.length === 0) {
      showToast('No hay registros válidos para importar en este archivo.');
      return;
    }

    setIsCommitting(true);
    setErrorMessage(null);
    try {
      const res = await api.post<ImportCommitResponse>(
        `/user-stories/${storyId}/import-cases/commit`,
        {
          project_id: projectId,
          strategy: importStrategy,
          items: validItems
        }
      );
      setImportResult(res);
      showToast(`¡Importación exitosa! ${res.created} creados para ${storyCode} ✓`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al persistir casos importados.');
      showToast('Error en importación: ' + err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDownloadErrorReport = async () => {
    if (!importPreview) return;
    const errorItems = importPreview.items.filter(it => it.status === 'ERROR');
    if (errorItems.length === 0) return;
    try {
      const blob = await api.postBlob('/test-cases/import/error-report', errorItems);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_errores_${storyCode}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showToast('Error al descargar reporte de errores: ' + err.message);
    }
  };

  const handleFinishSuccess = () => {
    resetState();
    onSuccess();
    onClose();
  };

  const totalValidOrWarning = importPreview
    ? importPreview.items.filter(it => it.status === 'VALID' || it.status === 'WARNING').length
    : 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(3px)',
        padding: '20px'
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !isUploading && !isCommitting) {
          handleClose();
        }
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            background: '#f8fafc'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  background: '#0f766e',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}
              >
                {storyCode}
              </span>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Importar Casos de Prueba desde Excel
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Los casos importados se asociarán automáticamente a <b>{storyCode}</b> ({storyTitle.slice(0, 60)}).
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading || isCommitting}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '22px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {errorMessage && (
            <div
              style={{
                background: '#fee2e2',
                border: '1px solid #fecdd3',
                color: '#991b1b',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '18px'
              }}
            >
              ⚠ {errorMessage}
            </div>
          )}

          {/* Step 1: Upload & Template */}
          {!importPreview && !importResult && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f0fdfa',
                  border: '1px solid #ccfbf1',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  marginBottom: '20px'
                }}
              >
                <div>
                  <b style={{ color: '#0f766e', fontSize: '14px' }}>Plantilla oficial Excel</b>
                  <div style={{ color: '#0d9488', fontSize: '12px', marginTop: '2px' }}>
                    Incluye 8 columnas: Código, Título, Módulo, Descripción, Precondiciones, Pasos a reproducir, Resultado esperado y Prioridad.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  style={{
                    background: '#0f766e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  📥 Descargar Plantilla
                </button>
              </div>

              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: isDragOver ? '2px dashed #0f766e' : '2px dashed #cbd5e1',
                  background: isDragOver ? '#f0fdfa' : '#f8fafc',
                  borderRadius: '14px',
                  padding: '42px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all .2s'
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                />
                <div style={{ fontSize: '42px', marginBottom: '12px' }}>📊</div>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>
                  Arrastra tu archivo Excel aquí o haz clic para seleccionar
                </div>
                <div style={{ color: '#64748b', fontSize: '12px', marginTop: '6px' }}>
                  Formatos soportados: <b>.xlsx</b>, <b>.xls</b> (máximo 10 MB, hasta 500 casos)
                </div>
                <div style={{ color: '#0f766e', fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>
                  * Si omites el código, se generará automáticamente (TC-xxx) de forma segura y sin colisiones.
                </div>
              </div>

              {isUploading && (
                <div style={{ textAlign: 'center', marginTop: '18px', color: '#0f766e', fontWeight: 700, fontSize: '14px' }}>
                  Validando estructura y preparando vista previa...
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview & Validation Table */}
          {importPreview && !importResult && (
            <div>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '18px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>ARCHIVO</div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '4px'
                    }}
                    title={importPreview.filename}
                  >
                    {importPreview.filename}
                  </div>
                </div>
                <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 700 }}>VÁLIDOS</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                    {importPreview.valid_count}
                  </div>
                </div>
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 700 }}>ADVERTENCIAS</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>
                    {importPreview.warning_count}
                  </div>
                </div>
                <div style={{ background: '#fee2e2', border: '1px solid #fecdd3', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 700 }}>ERRORES</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>
                    {importPreview.error_count}
                  </div>
                </div>
              </div>

              {/* Strategy Selector */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '16px'
                }}
              >
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                  Estrategia ante códigos existentes en el proyecto:
                </label>
                <div style={{ display: 'flex', gap: '20px', fontSize: '13px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="story_dup_strategy"
                      value="SKIP"
                      checked={importStrategy === 'SKIP'}
                      onChange={() => setImportStrategy('SKIP')}
                    />
                    <span>Omitir duplicados (Recomendado)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="story_dup_strategy"
                      value="UPDATE"
                      checked={importStrategy === 'UPDATE'}
                      onChange={() => setImportStrategy('UPDATE')}
                    />
                    <span>Actualizar y reasignar a esta historia</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="story_dup_strategy"
                      value="CANCEL"
                      checked={importStrategy === 'CANCEL'}
                      onChange={() => setImportStrategy('CANCEL')}
                    />
                    <span>Cancelar si existe duplicado</span>
                  </label>
                </div>
              </div>

              {/* Preview Table */}
              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  marginBottom: '14px'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr
                      style={{
                        background: '#f1f5f9',
                        borderBottom: '1px solid #cbd5e1',
                        position: 'sticky',
                        top: 0,
                        textAlign: 'left',
                        color: '#475569',
                        fontWeight: 700
                      }}
                    >
                      <th style={{ padding: '9px 10px', width: '50px' }}>Fila</th>
                      <th style={{ padding: '9px 10px', width: '100px' }}>Código</th>
                      <th style={{ padding: '9px 10px' }}>Título del Caso</th>
                      <th style={{ padding: '9px 10px', width: '90px' }}>Módulo</th>
                      <th style={{ padding: '9px 10px', width: '70px', textAlign: 'center' }}>Prio</th>
                      <th style={{ padding: '9px 10px', width: '95px' }}>Estado</th>
                      <th style={{ padding: '9px 10px' }}>Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '9px 10px', color: '#64748b' }}>{it.row_number}</td>
                        <td style={{ padding: '9px 10px', fontWeight: 800, color: '#0f172a' }}>{it.code}</td>
                        <td style={{ padding: '9px 10px', color: '#1e293b' }}>{it.title || '—'}</td>
                        <td style={{ padding: '9px 10px', color: '#475569' }}>{it.module_name || 'General'}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                          <span
                            style={{
                              background: it.priority === 'P1' ? '#fee2e2' : it.priority === 'P2' ? '#fef3c7' : '#f1f5f9',
                              color: it.priority === 'P1' ? '#991b1b' : it.priority === 'P2' ? '#92400e' : '#475569',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700
                            }}
                          >
                            {it.priority}
                          </span>
                        </td>
                        <td style={{ padding: '9px 10px' }}>
                          {it.status === 'VALID' && (
                            <span style={{ color: '#15803d', fontWeight: 700 }}>✓ Válido</span>
                          )}
                          {it.status === 'WARNING' && (
                            <span style={{ color: '#b45309', fontWeight: 700 }}>⚠ Duplicado</span>
                          )}
                          {it.status === 'ERROR' && (
                            <span style={{ color: '#b91c1c', fontWeight: 700 }}>✕ Error</span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: '9px 10px',
                            color: it.status === 'ERROR' ? '#b91c1c' : '#64748b',
                            fontSize: '11px'
                          }}
                        >
                          {it.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Error report button if any error */}
              {importPreview.error_count > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={handleDownloadErrorReport}
                    style={{
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      color: '#be123c',
                      borderRadius: '8px',
                      padding: '7px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    📄 Descargar reporte de errores Excel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Success Result */}
          {importResult && (
            <div style={{ textAlign: 'center', padding: '28px 16px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
              <h3 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#15803d' }}>
                ¡Casos importados exitosamente!
              </h3>
              <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 20px' }}>
                Los casos de prueba han sido asociados automáticamente a <b>{storyCode}</b>.
              </p>

              <div
                style={{
                  display: 'inline-grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px 24px',
                  marginBottom: '24px',
                  textAlign: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>PROCESADOS</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{importResult.processed}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 700 }}>CREADOS</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d' }}>{importResult.created}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 700 }}>ACTUALIZADOS</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0369a1' }}>{importResult.updated}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>OMITIDOS</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#64748b' }}>{importResult.skipped}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            background: '#f8fafc'
          }}
        >
          {importResult ? (
            <button
              type="button"
              onClick={handleFinishSuccess}
              style={{
                background: '#0f766e',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Aceptar y Ver Casos Asociados
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading || isCommitting}
                style={{
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              {importPreview && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setImportPreview(null);
                      setImportFile(null);
                      setErrorMessage(null);
                    }}
                    disabled={isCommitting}
                    style={{
                      background: 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '9px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0f766e',
                      cursor: 'pointer'
                    }}
                  >
                    ← Elegir otro archivo
                  </button>

                  <button
                    type="button"
                    onClick={handleCommitImport}
                    disabled={isCommitting || totalValidOrWarning === 0}
                    style={{
                      background: totalValidOrWarning > 0 ? '#0f766e' : '#94a3b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '9px 20px',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: totalValidOrWarning > 0 ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {isCommitting
                      ? 'Importando...'
                      : `Importar ${totalValidOrWarning} casos a ${storyCode}`}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
