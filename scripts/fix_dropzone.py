with open('frontend/src/components/EvidenceDropzone.tsx', 'w', encoding='utf-8') as f:
    f.write('''import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export interface EvidenceDraft {
  id: string;
  file: File;
  previewUrl: string;
  description: string;
}

interface EvidenceDropzoneProps {
  evidenceList: EvidenceDraft[];
  onChange: (list: EvidenceDraft[]) => void;
}

export const EvidenceDropzone: React.FC<EvidenceDropzoneProps> = ({ evidenceList, onChange }) => {
  const { showToast } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const ALLOWED_CLIPBOARD_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

  const addFile = (file: File, description = '') => {
    const draft: EvidenceDraft = {
      id: 'draft-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      file,
      previewUrl: URL.createObjectURL(file),
      description
    };
    onChange([...evidenceList, draft]);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) {
      showToast('No image found in clipboard. Copy a screenshot and try again.');
      return;
    }

    let foundImage = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (ALLOWED_CLIPBOARD_TYPES.includes(item.type)) {
        const file = item.getAsFile();
        if (file) {
          foundImage = true;
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const ext = item.type.split('/')[1] || 'png';
          const namedFile = new File([file], 'screenshot_' + timestamp + '.' + ext, { type: item.type });
          addFile(namedFile, 'Captura pegada desde el portapapeles');
        }
      }
    }

    if (foundImage) {
      e.preventDefault();
      showToast('Screenshot added as evidence ✓');
    } else {
      showToast('No image found in clipboard. Copy a screenshot and try again.');
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      addFile(file, '');
    });
    showToast(files.length + ' archivo(s) agregado(s) como evidencia ✓');
  };

  const removeEvidence = (id: string) => {
    const item = evidenceList.find(e => e.id === id);
    if (item) URL.revokeObjectURL(item.previewUrl);
    onChange(evidenceList.filter(e => e.id !== id));
  };

  const updateDescription = (id: string, description: string) => {
    onChange(evidenceList.map(e => e.id === id ? { ...e, description } : e));
  };

  return (
    <div>
      <div
        tabIndex={0}
        onPaste={handlePaste}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={(e) => {
          e.currentTarget.focus();
        }}
        style={{
          border: isDragOver ? '2px dashed #14b8a6' : '2px dashed #99f6e4',
          background: isDragOver ? '#e6fffa' : '#f0fdfa',
          borderRadius: '11px',
          padding: '22px 16px',
          textAlign: 'center',
          outline: 'none',
          cursor: 'pointer',
          transition: 'all 0.15s ease-in-out'
        }}
      >
        <div style={{ fontSize: '30px', marginBottom: '4px' }}>📋</div>
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f766e' }}>
          Paste screenshot
        </div>
        <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
          Press <b>Ctrl + V</b> to paste a screenshot
        </div>
        <div style={{ margin: '8px 0', color: '#94a3b8', fontSize: '11px' }}>
          or drag and drop an image here
        </div>
        <button
          type="button"
          style={{
            background: 'white',
            border: '1px solid #cbd5e1',
            borderRadius: '7px',
            padding: '7px 14px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          📁 [ Select files ]
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '6px' }}>
          PNG, JPG, WEBP (Portapapeles & Archivo) · PDF (Selector de archivos)
        </div>
      </div>

      {evidenceList.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '12px',
          marginTop: '14px'
        }}>
          {evidenceList.map((item, idx) => (
            <div
              key={item.id}
              style={{
                border: '1px solid #e6eaf0',
                borderRadius: '10px',
                overflow: 'hidden',
                background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ height: '120px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {item.file.type.startsWith('image/') ? (
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ fontSize: '32px' }}>📄</div>
                )}
              </div>
              <div style={{ padding: '8px' }}>
                <div style={{ fontSize: '11px', color: '#334155', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.file.name}
                </div>
                <input
                  type="text"
                  placeholder="Descripción de la evidencia..."
                  value={item.description}
                  onChange={(e) => updateDescription(item.id, e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    fontSize: '11px',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>#{idx + 1}</span>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#be123c',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    onClick={() => removeEvidence(item.id)}
                  >
                    🗑 Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
''')
