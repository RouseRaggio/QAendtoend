import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TestCasesPage } from '../pages/TestCasesPage';
import { ExecuteTestPage } from '../pages/ExecuteTestPage';
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
    <MemoryRouter>{children}</MemoryRouter>
  </AuthProvider>
);

describe('TestCasesPage - Enhanced Test Case Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header, download template and import buttons', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/projects')) {
        return Promise.resolve([{ id: 1, name: 'Sistema PQRSD', key: 'PQRSD' }]);
      }
      if (url.includes('/modules')) {
        return Promise.resolve([{ id: 1, name: 'Gestión de Solicitudes' }]);
      }
      if (url.includes('/test-cases')) {
        return Promise.resolve({
          items: [
            {
              id: 'tc-1',
              code: 'TC-PQRSD-001',
              title: 'Creación de PQRSD anónima',
              priority: 'P1',
              module: { id: 1, name: 'Gestión de Solicitudes' },
              preconditions: 'Acceso a la plataforma',
              is_archived: false,
            },
          ],
          total: 1,
          page: 1,
          page_size: 15,
          pages: 1,
        });
      }
      return Promise.resolve([]);
    });

    render(
      <Wrapper>
        <TestCasesPage />
      </Wrapper>
    );

    expect(screen.getByText('Casos de prueba')).toBeInTheDocument();
    expect(screen.getByText(/Descargar plantilla Excel/i)).toBeInTheDocument();
    expect(screen.getByText(/Importar Excel/i)).toBeInTheDocument();
    expect(screen.getByText(/Nuevo caso/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('TC-PQRSD-001')).toBeInTheDocument();
      expect(screen.getByText('Creación de PQRSD anónima')).toBeInTheDocument();
      expect(screen.getByText('P1')).toBeInTheDocument();
    });

    expect(screen.getByTitle('Ver detalle')).toBeInTheDocument();
    expect(screen.getByTitle('Editar caso')).toBeInTheDocument();
    expect(screen.getByTitle('Eliminar caso')).toBeInTheDocument();
  });

  it('opens and closes the Excel import modal correctly', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/test-cases')) {
        return Promise.resolve({
          items: [],
          total: 0,
          page: 1,
          page_size: 15,
          pages: 1,
        });
      }
      return Promise.resolve([]);
    });

    render(
      <Wrapper>
        <TestCasesPage />
      </Wrapper>
    );

    const importBtn = screen.getByText(/Importar Excel/i);
    fireEvent.click(importBtn);

    expect(screen.getByText(/Importar casos de prueba desde Excel/i)).toBeInTheDocument();
    expect(screen.getByText(/Arrastra tu archivo Excel/i)).toBeInTheDocument();

    const closeBtn = screen.getByText('Cancelar');
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Importar casos de prueba desde Excel/i)).not.toBeInTheDocument();
  });
});

describe('ExecuteTestPage - Test Execution Engine', () => {
  const mockExecution = {
    id: 1,
    project_id: 1,
    project_name: 'GESTADOC',
    name: 'Regresión Sprint 1',
    description: 'Ciclo de ejecución de prueba',
    version: 'v1.0.0',
    environment: 'QA',
    status: 'EN_EJECUCION',
    total_cases: 2,
    passed_count: 0,
    bugs_count: 0,
    improvements_count: 0,
    blocked_count: 0,
    pending_count: 2,
    in_progress_count: 0,
    executed_count: 0,
    progress_percentage: 0,
    cases: []
  };

  const mockCases = [
    {
      id: 101,
      execution_id: 1,
      test_case_id: 1,
      order_index: 0,
      code: 'WF-001',
      title: 'Creación de proceso básico',
      module_name: 'Workflow',
      description: 'Verificar creación de proceso',
      preconditions: 'Usuario con permisos',
      steps: ['Paso 1: Abrir módulo', 'Paso 2: Crear proceso'],
      expected_result: 'El proceso se crea correctamente',
      priority: 'P1',
      status: 'NOT_EXECUTED',
      actual_result: '',
      severity: 'NONE',
      observations: '',
      evidences: []
    },
    {
      id: 102,
      execution_id: 1,
      test_case_id: 2,
      order_index: 1,
      code: 'WF-002',
      title: 'Edición de proceso',
      module_name: 'Workflow',
      description: 'Verificar edición de proceso',
      preconditions: 'Proceso existente',
      steps: ['Paso 1: Seleccionar', 'Paso 2: Editar'],
      expected_result: 'El proceso se actualiza',
      priority: 'P2',
      status: 'NOT_EXECUTED',
      actual_result: '',
      severity: 'NONE',
      observations: '',
      evidences: []
    }
  ];

  it('renders test execution workspace and loads execution correctly', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/executions/1') return Promise.resolve(mockExecution);
      if (url === '/executions/1/cases') return Promise.resolve(mockCases);
      if (url.includes('/executions/1/cases/1')) return Promise.resolve({ ...mockCases[0], status: 'IN_PROGRESS' });
      return Promise.resolve([]);
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/execute-test?execution_id=1&case_id=1']}>
          <ExecuteTestPage />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Regresión Sprint 1/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText('WF-001').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Creación de proceso básico/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/El proceso se crea correctamente/i)).toBeInTheDocument();
    });
  });

  it('enforces validation for BUG status', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/executions/1') return Promise.resolve(mockExecution);
      if (url === '/executions/1/cases') return Promise.resolve(mockCases);
      if (url.includes('/executions/1/cases/1')) return Promise.resolve({ ...mockCases[0], status: 'IN_PROGRESS' });
      return Promise.resolve([]);
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/execute-test?execution_id=1&case_id=1']}>
          <ExecuteTestPage />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('WF-001').length).toBeGreaterThan(0);
    });

    const bugRadio = screen.getByLabelText(/BUG/i);
    fireEvent.click(bugRadio);

    const saveButton = screen.getByRole('button', { name: /Guardar resultado/i });
    fireEvent.click(saveButton);

    expect(api.postFormData).not.toHaveBeenCalled();
  });

  it('saves result successfully when valid form is submitted', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/executions/1') return Promise.resolve(mockExecution);
      if (url === '/executions/1/cases') return Promise.resolve(mockCases);
      if (url.includes('/executions/1/cases/1')) return Promise.resolve({ ...mockCases[0], status: 'IN_PROGRESS' });
      return Promise.resolve([]);
    });
    (api.postFormData as any).mockResolvedValue({ id: 101, status: 'PASSED' });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/execute-test?execution_id=1&case_id=1']}>
          <ExecuteTestPage />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('WF-001').length).toBeGreaterThan(0);
    });

    const textarea = screen.getByPlaceholderText(/Describe exactamente qué ocurrió/i);
    fireEvent.change(textarea, { target: { value: 'Proceso ejecutado conforme a especificación.' } });

    const saveButton = screen.getByRole('button', { name: /Guardar resultado/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.postFormData).toHaveBeenCalledWith('/executions/1/results', expect.any(FormData));
    });
  });

  it('saves draft successfully via Guardar borrador', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/executions/1') return Promise.resolve(mockExecution);
      if (url === '/executions/1/cases') return Promise.resolve(mockCases);
      if (url.includes('/executions/1/cases/1')) return Promise.resolve({ ...mockCases[0], status: 'IN_PROGRESS' });
      return Promise.resolve([]);
    });
    (api.postFormData as any).mockResolvedValue({ id: 101, status: 'IN_PROGRESS' });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/execute-test?execution_id=1&case_id=1']}>
          <ExecuteTestPage />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('WF-001').length).toBeGreaterThan(0);
    });

    const draftButton = screen.getByRole('button', { name: /Guardar borrador/i });
    fireEvent.click(draftButton);

    await waitFor(() => {
      expect(api.postFormData).toHaveBeenCalledWith('/executions/1/draft', expect.any(FormData));
    });
  });
});

