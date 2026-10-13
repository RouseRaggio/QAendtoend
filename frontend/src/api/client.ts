const API_BASE = '/api/v1';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: 'Bearer ' + token } : {};
}

export const api = {
  async get<T>(url: string): Promise<T> {
    const res = await fetch(API_BASE + url, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async post<T>(url: string, body: any): Promise<T> {
    const res = await fetch(API_BASE + url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async postFormData<T>(url: string, formData: FormData): Promise<T> {
    const res = await fetch(API_BASE + url, {
      method: 'POST',
      headers: {
        ...getAuthHeader()
      },
      body: formData
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async put<T>(url: string, body: any): Promise<T> {
    const res = await fetch(API_BASE + url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async delete<T>(url: string): Promise<T> {
    const res = await fetch(API_BASE + url, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getBlob(url: string): Promise<Blob> {
    const res = await fetch(API_BASE + url, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },

  async postBlob(url: string, body: any): Promise<Blob> {
    const res = await fetch(API_BASE + url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  }
};
