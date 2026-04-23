const API_URL = 'https://clinica-admin-web-ivklx.ondigitalocean.app/api';

const getToken = () => localStorage.getItem('adminToken');

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`
});

const headersFormData = () => ({
  'Authorization': `Bearer ${getToken()}`
});

async function handleResponse(res) {
  if (res.status === 401) {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminNombre');
    window.location.href = '/login.html';
    throw new Error('Sesión expirada');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Error ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    return await handleResponse(res);
  } catch (error) {
    if (error.status) throw error;
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
  }
}

const api = {
  login: async (email, password) => {
    return safeFetch(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
  },
  getCitas: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    return safeFetch(`${API_URL}/admin/citas?${qs}`, { headers: headers() });
  },
  updateCita: (id, estado) => safeFetch(`${API_URL}/admin/citas/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ estado })
  }),
  getMedicos: (incluirInactivos = false) => {
    const url = `${API_URL}/admin/medicos${incluirInactivos ? '?incluir_inactivos=true' : ''}`;
    return safeFetch(url, { headers: headers() });
  },
  getMedico: (id) => safeFetch(`${API_URL}/admin/medicos/${id}`, { headers: headers() }),
  crearMedico: (formData) => safeFetch(`${API_URL}/admin/medicos`, {
    method: 'POST',
    headers: headersFormData(),
    body: formData
  }),
  actualizarMedico: (id, formData) => safeFetch(`${API_URL}/admin/medicos/${id}`, {
    method: 'PUT',
    headers: headersFormData(),
    body: formData
  }),
  cambiarEstadoMedico: (id, activo) => safeFetch(`${API_URL}/admin/medicos/${id}/estado`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ activo })
  }),
  eliminarMedico: (id) => safeFetch(`${API_URL}/admin/medicos/${id}`, {
    method: 'DELETE',
    headers: headers()
  }),
  getHorarios: (medicoId) => safeFetch(`${API_URL}/admin/medicos/${medicoId}/horarios`, { headers: headers() }),
  crearHorario: (medicoId, data) => safeFetch(`${API_URL}/admin/medicos/${medicoId}/horarios`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  }),
  actualizarHorario: (id, data) => safeFetch(`${API_URL}/admin/horarios/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data)
  }),
  eliminarHorario: (id) => safeFetch(`${API_URL}/admin/horarios/${id}`, {
    method: 'DELETE',
    headers: headers()
  }),
  getEspecialidades: () => safeFetch(`${API_URL}/admin/especialidades`, { headers: headers() }),
  getPacientes: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    return safeFetch(`${API_URL}/admin/pacientes?${qs}`, { headers: headers() });
  },
  getReportes: () => safeFetch(`${API_URL}/admin/reportes`, { headers: headers() })
};