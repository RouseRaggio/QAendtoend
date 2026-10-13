import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UserStoryDetailPage } from '../pages/UserStoryDetailPage';
import { StoryAIGeneratorModal } from '../components/StoryAIGeneratorModal';
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

const sampleStory = {
  id: 10,
  project_id: 1,
  project_name: 'GESTADOC',
  code: 'HU-010',
  title: 'Flujo de radicación electrónica',
  description: 'Como usuario radico documentos electrónicamente',
  story_text: 'Como usuario radico documentos electrónicamente',
  status: 'TESTING',
  acceptance_criteria: ['Debe validar número de radicado', 'Debe confirmar guardado'],
  business_rules: 'El radicado es único anual',
  test_cases: [
    {
      id: 101,
      code: 'TC-001',
      title: 'Validar radicación exitosa',
      priority: 'P1',
      last_result: 'PASSED',
      expected_result: 'Radicado generado',
      steps: ['Paso 1', 'Paso 2'],
      preconditions: 'Usuario activo'
    }
  ],
  executions: [],
  metrics: {
    total_cases: 1,
    passed: 1,
    failed: 0,
    blocked: 0,
    pending: 0,
    pass_rate: 100,
    coverage_percentage: 100
  }
};

const samplePagedCases = {
  items: [
    {
      id: 101,
      project_id: 1,
      code: 'TC-001',
      title: 'Validar radicación exitosa',
      priority: 'P1',
      last_result: 'PASSED',
      expected_result: 'Radicado generado',
      steps: ['Paso 1', 'Paso 2'],
      preconditions: 'Usuario activo',
      tags: [],
      is_ai_generated: false,
      created_at: '2026-10-13T10:00:00'
    }
  ],
  total: 1,
  page: 1,
  page_size: 10,
  pages: 1
};

describe('UserStoryDetailPage Management Enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all toolbar actions including "Generar casos con IA", "Importar Excel" and "Descargar Plantilla"', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/test-cases')) {
        return Promise.resolve(samplePagedCases);
      }
      return Promise.resolve(sampleStory);
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
      expect(screen.getByText(/Casos de Prueba Asociados/i)).toBeInTheDocument();
    });

    expect(screen.getByTestId('ai-generate-header-btn')).toBeInTheDocument();
    expect(screen.getByTestId('import-excel-header-btn')).toBeInTheDocument();
    expect(screen.getByTestId('download-template-header-btn')).toBeInTheDocument();
    expect(screen.getByText('+ Nuevo Caso')).toBeInTheDocument();
    expect(screen.getByText('+ Vincular Existente')).toBeInTheDocument();
  });

  it('supports pagination controls, search, and page size selection', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/test-cases')) {
        return Promise.resolve({
          items: [
            {
              id: 101,
              code: 'TC-001',
              title: 'Test Case Uno',
              priority: 'P1',
              last_result: 'PASSED',
              expected_result: 'Resultado 1',
              steps: ['Paso 1']
            }
          ],
          total: 25,
          page: 1,
          page_size: 10,
          pages: 3
        });
      }
      return Promise.resolve(sampleStory);
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
      expect(screen.getByText(/Página 1 de 3/i)).toBeInTheDocument();
      expect(screen.getByText(/Mostrando 1–10 de 25 casos/i)).toBeInTheDocument();
    });

    // Test search filter input
    const searchInput = screen.getByPlaceholderText(/Buscar por código, título o resultado.../i);
    fireEvent.change(searchInput, { target: { value: 'Uno' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('search=Uno'));
    });
  });

  it('opens and interacts with StoryAIGeneratorModal', async () => {
    vi.mocked(api.post).mockImplementation((url: string) => {
      if (url.includes('/ai/generate')) {
        return Promise.resolve({
          user_story_id: 10,
          analysis: { requirements: [], business_rules: [], roles: [], risks: [], ambiguities: [] },
          test_cases: [
            {
              temp_code: 'CP-IA-001',
              title: 'Generado IA 1',
              test_type: 'POSITIVE',
              priority: 'P2',
              preconditions: 'Precondición',
              steps: ['Paso 1'],
              expected_result: 'Resultado',
              traceability: []
            }
          ]
        });
      }
      if (url.includes('/ai/approve')) {
        return Promise.resolve([
          {
            id: 201,
            code: 'TC-002',
            title: 'Generado IA 1',
            priority: 'P2'
          }
        ]);
      }
      return Promise.resolve({});
    });

    render(
      <AuthProvider>
        <StoryAIGeneratorModal
          isOpen={true}
          onClose={vi.fn()}
          storyId={10}
          storyCode="HU-010"
          storyTitle="Flujo de radicación electrónica"
          storyDescription="Descripción de prueba"
          acceptanceCriteria={['Criterio 1']}
          projectId={1}
          onSuccess={vi.fn()}
        />
      </AuthProvider>
    );

    expect(screen.getByText(/Generar Casos de Prueba con IA/i)).toBeInTheDocument();
    const generateBtn = screen.getByTestId('ai-generate-preview-btn');
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText('Generado IA 1')).toBeInTheDocument();
    });

    const saveBtn = screen.getByTestId('ai-save-selected-btn');
    expect(saveBtn).toBeInTheDocument();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/ai/approve', expect.any(Object));
    });
  });

  it('opens View, Edit, and Delete modals from compact action buttons', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/test-cases')) {
        return Promise.resolve(samplePagedCases);
      }
      return Promise.resolve(sampleStory);
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
      expect(screen.getByText('TC-001')).toBeInTheDocument();
    });

    // 1. Click "Ver"
    const viewBtn = screen.getByRole('button', { name: 'Ver' });
    fireEvent.click(viewBtn);
    expect(screen.getByText(/HISTORIA DE USUARIO/i)).toBeInTheDocument();
    const closeBtn = screen.getByRole('button', { name: 'Cerrar' });
    fireEvent.click(closeBtn);

    // 2. Click "Editar"
    const editBtn = screen.getByRole('button', { name: 'Editar' });
    fireEvent.click(editBtn);
    expect(screen.getByText(/Editar Caso TC-001/i)).toBeInTheDocument();
    const cancelEditBtn = screen.getByRole('button', { name: 'Cancelar' });
    fireEvent.click(cancelEditBtn);

    // 3. Click "Eliminar"
    const deleteBtn = screen.getByRole('button', { name: 'Eliminar' });
    fireEvent.click(deleteBtn);
    expect(screen.getByText(/Gestionar Caso TC-001/i)).toBeInTheDocument();
    expect(screen.getByText(/1. Desacoplar de HU-010/i)).toBeInTheDocument();
    expect(screen.getByText(/2. Eliminar definitivamente del sistema/i)).toBeInTheDocument();
  });
});
