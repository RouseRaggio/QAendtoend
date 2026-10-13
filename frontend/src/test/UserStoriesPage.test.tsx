import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UserStoriesPage } from '../pages/UserStoriesPage';
import { AuthProvider } from '../context/AuthContext';
import { api } from '../api/client';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

const sampleStories = [
  {
    id: 1,
    project_id: 1,
    code: 'HU-001',
    title: 'Gestión de radicación de documentos',
    description: 'Como usuario deseo radicar documentos',
    acceptance_criteria: ['Dado que se sube un PDF, debe generar número de radicado'],
    status: 'TODO',
    test_cases_count: 5,
    latest_execution_status: null,
    created_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 2,
    project_id: 1,
    code: 'HU-002',
    title: 'Búsqueda avanzada de expedientes',
    description: 'Como archivista deseo buscar expedientes',
    acceptance_criteria: ['Debe filtrar por fecha y serie'],
    status: 'IN_PROGRESS',
    test_cases_count: 3,
    latest_execution_status: 'EN_EJECUCION',
    created_at: '2026-10-02T10:00:00Z',
  },
];

describe('UserStoriesPage CRUD and Row Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table with all 4 row actions: Abrir HU, Ver detalle, Editar, Eliminar', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/projects')) return Promise.resolve([{ id: 1, name: 'GESTADOC', key: 'GDC' }]);
      if (url.includes('/user-stories')) return Promise.resolve(sampleStories);
      return Promise.resolve([]);
    });

    render(
      <Wrapper>
        <UserStoriesPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('HU-001')).toBeInTheDocument();
      expect(screen.getByText('HU-002')).toBeInTheDocument();
    });

    // Check actions for each story
    expect(screen.getAllByRole('button', { name: /Abrir HU/i }).length).toBe(2);
    expect(screen.getAllByRole('button', { name: /Ver detalle/i }).length).toBe(2);
    expect(screen.getAllByRole('button', { name: /Editar/i }).length).toBe(2);
    expect(screen.getAllByRole('button', { name: /Eliminar/i }).length).toBe(2);
  });

  it('navigates to user story detail when clicking "Ver detalle" or "Abrir HU"', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/projects')) return Promise.resolve([{ id: 1, name: 'GESTADOC', key: 'GDC' }]);
      if (url.includes('/user-stories')) return Promise.resolve(sampleStories);
      return Promise.resolve([]);
    });

    render(
      <Wrapper>
        <UserStoriesPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('HU-001')).toBeInTheDocument();
    });

    const verDetalleBtns = screen.getAllByRole('button', { name: /Ver detalle/i });
    fireEvent.click(verDetalleBtns[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/user-stories/1');

    const abrirHuBtns = screen.getAllByRole('button', { name: /Abrir HU/i });
    fireEvent.click(abrirHuBtns[1]);
    expect(mockNavigate).toHaveBeenCalledWith('/user-stories/2');
  });

  it('opens edit modal with prefilled data and submits update', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/projects')) return Promise.resolve([{ id: 1, name: 'GESTADOC', key: 'GDC' }]);
      if (url.includes('/user-stories')) return Promise.resolve(sampleStories);
      return Promise.resolve([]);
    });
    (api.put as any).mockResolvedValue({ ...sampleStories[0], title: 'Gestión de radicación Modificada' });

    render(
      <Wrapper>
        <UserStoriesPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('HU-001')).toBeInTheDocument();
    });

    const editBtns = screen.getAllByRole('button', { name: /Editar/i });
    fireEvent.click(editBtns[0]);

    // Modal opens with story data
    expect(screen.getByText('Editar Historia: HU-001')).toBeInTheDocument();
    const titleInput = screen.getByDisplayValue('Gestión de radicación de documentos');
    fireEvent.change(titleInput, { target: { value: 'Gestión de radicación Modificada' } });

    const submitBtn = screen.getByRole('button', { name: /Actualizar Historia/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/user-stories/1',
        expect.objectContaining({
          title: 'Gestión de radicación Modificada',
          project_id: 1,
        })
      );
    });
  });

  it('opens delete confirmation modal, allows canceling without deleting', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/projects')) return Promise.resolve([{ id: 1, name: 'GESTADOC', key: 'GDC' }]);
      if (url.includes('/user-stories')) return Promise.resolve(sampleStories);
      return Promise.resolve([]);
    });

    render(
      <Wrapper>
        <UserStoriesPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('HU-001')).toBeInTheDocument();
    });

    const delBtns = screen.getAllByRole('button', { name: /Eliminar/i });
    fireEvent.click(delBtns[0]);

    // Confirmation dialog appears with code and title
    expect(screen.getByText('¿Eliminar Historia de Usuario?')).toBeInTheDocument();
    expect(screen.getByText(/Protección de Casos de Prueba/i)).toBeInTheDocument();
    expect(screen.getByText(/Política de Retención QA/i)).toBeInTheDocument();

    // Click Cancel
    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    // Modal closes and delete API was NOT called
    expect(screen.queryByText('¿Eliminar Historia de Usuario?')).not.toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('confirms deletion, calls delete endpoint and refreshes listing', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/projects')) return Promise.resolve([{ id: 1, name: 'GESTADOC', key: 'GDC' }]);
      if (url.includes('/user-stories')) return Promise.resolve(sampleStories);
      return Promise.resolve([]);
    });
    (api.delete as any).mockResolvedValue({
      message: 'Historia de Usuario HU-001 eliminada exitosamente. 5 casos desacoplados.',
      detached_cases_count: 5,
    });

    render(
      <Wrapper>
        <UserStoriesPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('HU-001')).toBeInTheDocument();
    });

    const delBtns = screen.getAllByRole('button', { name: /Eliminar/i });
    fireEvent.click(delBtns[0]);

    const confirmBtn = screen.getByRole('button', { name: /Eliminar definitivamente/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/user-stories/1');
    });
  });

  it('displays error explanation when deletion is blocked by backend', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/projects')) return Promise.resolve([{ id: 1, name: 'GESTADOC', key: 'GDC' }]);
      if (url.includes('/user-stories')) return Promise.resolve(sampleStories);
      return Promise.resolve([]);
    });
    (api.delete as any).mockRejectedValue(
      new Error(JSON.stringify({ detail: 'No es posible eliminar: cuenta con historial de ejecución activo.' }))
    );

    render(
      <Wrapper>
        <UserStoriesPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('HU-001')).toBeInTheDocument();
    });

    const delBtns = screen.getAllByRole('button', { name: /Eliminar/i });
    fireEvent.click(delBtns[0]);

    const confirmBtn = screen.getByRole('button', { name: /Eliminar definitivamente/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/cuenta con historial de ejecución activo/i).length).toBeGreaterThan(0);
    });
  });

  it('supports compact pagination footer and page size change', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/projects')) return Promise.resolve([{ id: 1, name: 'GESTADOC', key: 'GDC' }]);
      if (url.includes('/user-stories')) return Promise.resolve(sampleStories);
      return Promise.resolve([]);
    });

    render(
      <Wrapper>
        <UserStoriesPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('HU-001')).toBeInTheDocument();
    });

    expect(screen.getByText(/Mostrando/i)).toBeInTheDocument();
    expect(screen.getByText('10 por página')).toBeInTheDocument();
  });

  it('opens new story modal and creates new user story', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/projects')) return Promise.resolve([{ id: 1, name: 'GESTADOC', key: 'GDC' }]);
      if (url.includes('/user-stories')) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    (api.post as any).mockResolvedValue({ id: 10, title: 'Nueva Historia Creada', code: 'HU-010' });

    render(
      <Wrapper>
        <UserStoriesPage />
      </Wrapper>
    );

    const newBtn = screen.getByText(/Nueva Historia/i);
    fireEvent.click(newBtn);

    expect(screen.getByText('Nueva Historia de Usuario')).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(/Autenticación de usuario con MFA/i);
    fireEvent.change(titleInput, { target: { value: 'Nueva Historia Creada' } });

    const submitBtn = screen.getByRole('button', { name: /Crear Historia/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/user-stories',
        expect.objectContaining({
          title: 'Nueva Historia Creada',
        })
      );
    });
  });
});
