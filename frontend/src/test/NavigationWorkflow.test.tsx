import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectsPage } from '../pages/ProjectsPage';
import { UserStoryDetailPage } from '../pages/UserStoryDetailPage';
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

describe('Projects and Story Navigation Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ProjectsPage and displays metrics and open button', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/projects') {
        return Promise.resolve([
          {
            id: 1,
            name: 'GESTADOC',
            key: 'GDC',
            description: 'Sistema de Gestión Documental',
            version: 'v1.0.0',
            status: 'ACTIVE',
            created_at: '2026-10-01T00:00:00Z',
            modules_count: 3,
            test_cases_count: 15,
            user_stories_count: 4,
          }
        ]);
      }
      return Promise.resolve([]);
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/projects']}>
          <Routes>
            <Route path="/projects" element={<ProjectsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('GESTADOC')).toBeInTheDocument();
      expect(screen.getByText('Abrir proyecto')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument(); // test cases count
      expect(screen.getByText('4')).toBeInTheDocument(); // user stories count
    });
  });

  it('renders UserStoryDetailPage with Iniciar pruebas CTA and modal preview', async () => {
    const mockStoryDetail = {
      id: 10,
      project_id: 1,
      project_name: 'GESTADOC',
      code: 'HU-010',
      title: 'Firma electrónica de resoluciones',
      description: 'Como revisor deseo firmar electrónicamente',
      status: 'TODO',
      acceptance_criteria: ['Debe validar certificado'],
      test_cases_count: 2,
      metrics: {
        total_cases: 2,
        passed: 1,
        failed: 0,
        blocked: 0,
        pending: 1,
        pass_rate: 50,
        coverage_percentage: 100
      },
      test_cases: [
        {
          id: 101,
          project_id: 1,
          code: 'TC-010-01',
          title: 'Validar firma con certificado válido',
          expected_result: 'Firma estampada exitosamente',
          priority: 'P1',
          steps: ['Subir certificado'],
          tags: [],
          is_ai_generated: false,
          created_at: '2026-10-01T00:00:00Z'
        },
        {
          id: 102,
          project_id: 1,
          code: 'TC-010-02',
          title: 'Rechazar firma con certificado revocado',
          expected_result: 'Error de validación mostrado',
          priority: 'P2',
          steps: ['Subir certificado revocado'],
          tags: [],
          is_ai_generated: false,
          created_at: '2026-10-01T00:00:00Z'
        }
      ],
      executions: []
    };

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/user-stories/10') return Promise.resolve(mockStoryDetail);
      return Promise.resolve([]);
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
      expect(screen.getAllByText('HU-010').length).toBeGreaterThan(0);
      expect(screen.getByText('Firma electrónica de resoluciones')).toBeInTheDocument();
      // CTA button with case count
      expect(screen.getByText(/Iniciar pruebas/i)).toBeInTheDocument();
    });

    // Open execution setup modal
    const startBtn = screen.getByText(/Iniciar pruebas/i);
    fireEvent.click(startBtn);

    // Modal opens showing preview of test cases in order
    expect(screen.getByText('Iniciar Pruebas · HU-010')).toBeInTheDocument();
    expect(screen.getByText(/TC-010-01 — Validar firma con certificado válido/i)).toBeInTheDocument();
    expect(screen.getByText(/TC-010-02 — Rechazar firma con certificado revocado/i)).toBeInTheDocument();
  });

  it('renders guided launcher on ExecuteTestPage when no execution_id is provided', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/projects') {
        return Promise.resolve([{ id: 1, name: 'GESTADOC', key: 'GDC' }]);
      }
      if (url === '/executions') {
        return Promise.resolve([]);
      }
      if (url.includes('/user-stories')) {
        return Promise.resolve([
          { id: 10, project_id: 1, code: 'HU-010', title: 'Firma electrónica', test_cases_count: 2 }
        ]);
      }
      return Promise.resolve([]);
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/execute-test']}>
          <Routes>
            <Route path="/execute-test" element={<ExecuteTestPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Espacio de Ejecución de Pruebas')).toBeInTheDocument();
      expect(screen.getByText('Iniciar Nueva Corrida por Historia de Usuario')).toBeInTheDocument();
      expect(screen.getByText(/Iniciar Pruebas Enfocadas/i)).toBeInTheDocument();
    });
  });
});
