import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StoryExcelImportModal } from '../components/StoryExcelImportModal';
import { UserStoryDetailPage } from '../pages/UserStoryDetailPage';
import { AuthProvider } from '../context/AuthContext';
import { api } from '../api/client';

vi.mock('../api/client', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    postFormData: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getBlob: vi.fn(),
    postBlob: vi.fn(),
  };
  return {
    apiClient: mockApi,
    api: mockApi,
  };
});

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <MemoryRouter initialEntries={['/projects/1/user-stories/10']}>
      {children}
    </MemoryRouter>
  </AuthProvider>
);

describe('StoryExcelImportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with user story code, title and template download button', () => {
    render(
      <AuthProvider>
        <StoryExcelImportModal
          isOpen={true}
          onClose={vi.fn()}
          storyId={10}
          storyCode="HU-010"
          storyTitle="Flujo de radicación electrónica"
          projectId={1}
          onSuccess={vi.fn()}
        />
      </AuthProvider>
    );

    expect(screen.getAllByText('HU-010').length).toBeGreaterThan(0);
    expect(screen.getByText(/Importar Casos de Prueba desde Excel/i)).toBeInTheDocument();
    expect(screen.getByText(/Descargar Plantilla/i)).toBeInTheDocument();
  });

  it('downloads Excel template on clicking template button', async () => {
    const mockBlob = new Blob(['dummy content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    (api.getBlob as any).mockResolvedValue(mockBlob);

    // Mock window.URL.createObjectURL and revokeObjectURL
    window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test-blob');
    window.URL.revokeObjectURL = vi.fn();

    render(
      <AuthProvider>
        <StoryExcelImportModal
          isOpen={true}
          onClose={vi.fn()}
          storyId={10}
          storyCode="HU-010"
          storyTitle="Flujo de radicación electrónica"
          projectId={1}
          onSuccess={vi.fn()}
        />
      </AuthProvider>
    );

    const downloadBtn = screen.getByText(/Descargar Plantilla/i);
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(api.getBlob).toHaveBeenCalledWith('/user-stories/10/import-cases/template');
    });
  });

  it('uploads file, parses preview, and commits import associated to User Story', async () => {
    const mockPreviewResponse = {
      filename: 'casos_radicacion.xlsx',
      total_rows: 2,
      valid_count: 2,
      warning_count: 0,
      error_count: 0,
      items: [
        {
          row_number: 2,
          code: 'TC-001',
          title: 'Validar radicación exitosa',
          module_name: 'Radicación',
          description: 'Caso de radicación',
          preconditions: 'Usuario activo',
          steps: ['1. Abrir formulario', '2. Adjuntar PDF'],
          expected_result: 'Radicado generado con número',
          priority: 'P1',
          status: 'VALID' as const,
          message: 'Válido',
          exists_in_db: false
        },
        {
          row_number: 3,
          code: 'TC-002',
          title: 'Validar rechazo por archivo corrupto',
          module_name: 'Radicación',
          description: 'Validar error',
          preconditions: 'Usuario activo',
          steps: ['1. Adjuntar archivo corrupto'],
          expected_result: 'Muestra mensaje de error',
          priority: 'P2',
          status: 'VALID' as const,
          message: 'Válido',
          exists_in_db: false
        }
      ]
    };

    const mockCommitResponse = {
      processed: 2,
      created: 2,
      updated: 0,
      skipped: 0,
      errors: [],
      total_associated_cases: 2
    };

    (api.postFormData as any).mockResolvedValue(mockPreviewResponse);
    (api.post as any).mockResolvedValue(mockCommitResponse);

    const onSuccess = vi.fn();

    const { container } = render(
      <AuthProvider>
        <StoryExcelImportModal
          isOpen={true}
          onClose={vi.fn()}
          storyId={10}
          storyCode="HU-010"
          storyTitle="Flujo de radicación electrónica"
          projectId={1}
          onSuccess={onSuccess}
        />
      </AuthProvider>
    );

    // Find file input
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const file = new File(['dummy xlsx content'], 'casos_radicacion.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(api.postFormData).toHaveBeenCalledWith(
        '/user-stories/10/import-cases/preview?project_id=1',
        expect.any(FormData)
      );
    });

    // Check preview table displayed
    expect(screen.getByText('Validar radicación exitosa')).toBeInTheDocument();
    expect(screen.getByText('Validar rechazo por archivo corrupto')).toBeInTheDocument();

    // Click commit import button
    const commitBtn = screen.getByRole('button', { name: /Importar 2 casos a HU-010/i });
    expect(commitBtn).toBeInTheDocument();
    fireEvent.click(commitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/user-stories/10/import-cases/commit',
        expect.objectContaining({
          project_id: 1,
          strategy: 'SKIP',
          items: expect.any(Array)
        })
      );
    });

    // Check success view
    expect(screen.getByText(/¡Casos importados exitosamente!/i)).toBeInTheDocument();
    const finishBtn = screen.getByRole('button', { name: /Aceptar y Ver Casos Asociados/i });
    fireEvent.click(finishBtn);
    expect(onSuccess).toHaveBeenCalled();
  });
});

describe('UserStoryDetailPage Excel Import Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Importar Excel" button and opens modal when clicked', async () => {
    const mockStoryDetail = {
      id: 10,
      project_id: 1,
      project_name: 'GESTADOC',
      code: 'HU-010',
      title: 'Flujo de radicación electrónica',
      description: 'Como usuario deseo radicar documentos',
      status: 'TODO',
      acceptance_criteria: ['Debe generar PDF de radicado'],
      test_cases_count: 1,
      test_cases: [
        {
          id: 101,
          project_id: 1,
          code: 'TC-001',
          title: 'Verificar radicación exitosa',
          expected_result: 'Radicado generado',
          priority: 'P1',
          user_story_id: 10,
          created_at: '2026-10-01T10:00:00Z',
        }
      ],
      executions: [],
      metrics: {
        total_cases: 1,
        passed: 0,
        failed: 0,
        blocked: 0,
        pending: 1,
        pass_rate: 0,
        coverage_percentage: 100
      },
      created_at: '2026-10-01T10:00:00Z',
      updated_at: '2026-10-01T10:00:00Z'
    };

    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/user-stories/10')) {
        return Promise.resolve(mockStoryDetail);
      }
      return Promise.resolve({});
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/projects/1/user-stories/10']}>
          <Routes>
            <Route path="/projects/:projectId/user-stories/:id" element={<UserStoryDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Flujo de radicación electrónica')).toBeInTheDocument();
    });

    // Verify all 4 required actions are present in the Casos de Prueba Asociados section header
    expect(screen.getByRole('button', { name: /\+ Nuevo Caso/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Vincular Existente/i })).toBeInTheDocument();
    expect(screen.getByTestId('import-excel-header-btn')).toBeInTheDocument();
    expect(screen.getByTestId('download-template-header-btn')).toBeInTheDocument();

    // Click to open modal
    fireEvent.click(screen.getByTestId('import-excel-header-btn'));

    // Modal should now be open
    await waitFor(() => {
      expect(screen.getByText(/Importar Casos de Prueba desde Excel/i)).toBeInTheDocument();
    });
  });

  it('renders "Importar Excel" and "Descargar Plantilla" when User Story has zero cases (empty state)', async () => {
    const mockEmptyStoryDetail = {
      id: 12,
      project_id: 1,
      project_name: 'GESTADOC',
      code: 'HU-012',
      title: 'Historia sin casos asociados',
      description: 'Historia para verificar estado vacío',
      status: 'TODO',
      acceptance_criteria: ['Criterio 1'],
      test_cases_count: 0,
      test_cases: [],
      executions: [],
      metrics: {
        total_cases: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        pending: 0,
        pass_rate: 0,
        coverage_percentage: 0
      },
      created_at: '2026-10-01T10:00:00Z',
      updated_at: '2026-10-01T10:00:00Z'
    };

    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/user-stories/12')) {
        return Promise.resolve(mockEmptyStoryDetail);
      }
      return Promise.resolve({});
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/projects/1/user-stories/12']}>
          <Routes>
            <Route path="/projects/:projectId/user-stories/:id" element={<UserStoryDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Historia sin casos asociados')).toBeInTheDocument();
      expect(screen.getByText('No hay casos de prueba asociados a esta historia')).toBeInTheDocument();
    });

    // Check actions in the empty state
    expect(screen.getByTestId('import-excel-empty-btn')).toBeInTheDocument();
    expect(screen.getByTestId('download-template-empty-btn')).toBeInTheDocument();

    // Clicking empty state Importar Excel opens the modal
    fireEvent.click(screen.getByTestId('import-excel-empty-btn'));

    await waitFor(() => {
      expect(screen.getByText(/Importar Casos de Prueba desde Excel/i)).toBeInTheDocument();
    });
  });

  it('downloads template directly from header action button', async () => {
    const mockBlob = new Blob(['template bytes'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    (api.getBlob as any).mockResolvedValue(mockBlob);
    window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test-template');
    window.URL.revokeObjectURL = vi.fn();

    const mockStoryDetail = {
      id: 10,
      project_id: 1,
      project_name: 'GESTADOC',
      code: 'HU-010',
      title: 'Flujo de radicación electrónica',
      description: 'Como usuario deseo radicar documentos',
      status: 'TODO',
      acceptance_criteria: ['Criterio 1'],
      test_cases_count: 0,
      test_cases: [],
      executions: [],
      metrics: {
        total_cases: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        pending: 0,
        pass_rate: 0,
        coverage_percentage: 0
      },
      created_at: '2026-10-01T10:00:00Z',
      updated_at: '2026-10-01T10:00:00Z'
    };

    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/user-stories/10')) {
        return Promise.resolve(mockStoryDetail);
      }
      return Promise.resolve({});
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/projects/1/user-stories/10']}>
          <Routes>
            <Route path="/projects/:projectId/user-stories/:id" element={<UserStoryDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Flujo de radicación electrónica')).toBeInTheDocument();
    });

    const downloadBtn = screen.getByTestId('download-template-header-btn');
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(api.getBlob).toHaveBeenCalledWith('/user-stories/10/import-cases/template');
    });
  });
});
