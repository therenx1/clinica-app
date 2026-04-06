const API_URL = 'https://clinica-admin-web-ivklx.ondigitalocean.app/api';

const getToken = () => localStorage.getItem('adminToken');

const headers = () => ({
  'Content-Type': 'application/json',
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
  getMedicos: async () => {
    const res = await fetch(`${API_URL}/admin/medicos`, { headers: headers() });
    return res.json();
  },
  crearMedico: async (data) => {
    const res = await fetch(`${API_URL}/admin/medicos`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
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