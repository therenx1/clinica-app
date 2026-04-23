const API_URL = 'https://clinica-admin-web-ivklx.ondigitalocean.app/api';

const getToken = () => localStorage.getItem('adminToken');

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`
});

const headersFormData = () => ({
  'Authorization': `Bearer ${getToken()}`
});

const api = {
  login: async (email, password) => {
    const res = await fetch(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },
  getCitas: async () => {
    const res = await fetch(`${API_URL}/admin/citas`, { headers: headers() });
    return res.json();
  },
  updateCita: async (id, estado) => {
    const res = await fetch(`${API_URL}/admin/citas/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ estado })
    });
    return res.json();
  },
  getMedicos: async (incluirInactivos = false) => {
    const url = `${API_URL}/admin/medicos${incluirInactivos ? '?incluir_inactivos=true' : ''}`;
    const res = await fetch(url, { headers: headers() });
    return res.json();
  },
  getMedico: async (id) => {
    const res = await fetch(`${API_URL}/admin/medicos/${id}`, { headers: headers() });
    return res.json();
  },
  crearMedico: async (formData) => {
    const res = await fetch(`${API_URL}/admin/medicos`, {
      method: 'POST',
      headers: headersFormData(),
      body: formData
    });
    return res.json();
  },
  actualizarMedico: async (id, formData) => {
    const res = await fetch(`${API_URL}/admin/medicos/${id}`, {
      method: 'PUT',
      headers: headersFormData(),
      body: formData
    });
    return res.json();
  },
  cambiarEstadoMedico: async (id, activo) => {
    const res = await fetch(`${API_URL}/admin/medicos/${id}/estado`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ activo })
    });
    return res.json();
  },
  eliminarMedico: async (id) => {
    const res = await fetch(`${API_URL}/admin/medicos/${id}`, {
      method: 'DELETE',
      headers: headers()
    });
    return res.json();
  },
  getEspecialidades: async () => {
    const res = await fetch(`${API_URL}/admin/especialidades`, { headers: headers() });
    return res.json();
  },
  getPacientes: async () => {
    const res = await fetch(`${API_URL}/admin/pacientes`, { headers: headers() });
    return res.json();
  },
  getReportes: async () => {
    const res = await fetch(`${API_URL}/admin/reportes`, { headers: headers() });
    return res.json();
  }
};