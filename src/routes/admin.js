const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const verificarAdmin = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Admin no encontrado' });
    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });
    const token = jwt.sign({ id: rows[0].id, email: rows[0].email, rol: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, admin: { id: rows[0].id, nombre: rows[0].nombre, email: rows[0].email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/citas', verificarAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, 
        u.nombre AS paciente_nombre, u.apellido AS paciente_apellido,
        m.nombre AS medico_nombre, m.apellido AS medico_apellido,
        e.nombre AS especialidad
      FROM citas c
      JOIN usuarios u ON c.usuario_id = u.id
      JOIN medicos m ON c.medico_id = m.id
      JOIN especialidades e ON m.especialidad_id = e.id
      ORDER BY c.fecha DESC, c.hora DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/citas/:id', verificarAdmin, async (req, res) => {
  try {
    const { estado } = req.body;
    await pool.query('UPDATE citas SET estado = ? WHERE id = ?', [estado, req.params.id]);
    res.json({ mensaje: 'Cita actualizada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pacientes', verificarAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, apellido, email, telefono, dni, created_at FROM usuarios'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/medicos', verificarAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.*, e.nombre AS especialidad
      FROM medicos m
      JOIN especialidades e ON m.especialidad_id = e.id
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/medicos', verificarAdmin, async (req, res) => {
  try {
    const { especialidad_id, nombre, apellido, email, telefono } = req.body;
    const [result] = await pool.query(
      'INSERT INTO medicos (especialidad_id, nombre, apellido, email, telefono) VALUES (?,?,?,?,?)',
      [especialidad_id, nombre, apellido, email, telefono]
    );
    res.json({ mensaje: 'Médico creado', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reportes', verificarAdmin, async (req, res) => {
  try {
    const [[totalCitas]] = await pool.query('SELECT COUNT(*) AS total FROM citas');
    const [[citasPendientes]] = await pool.query("SELECT COUNT(*) AS total FROM citas WHERE estado = 'pendiente'");
    const [[citasCompletadas]] = await pool.query("SELECT COUNT(*) AS total FROM citas WHERE estado = 'completada'");
    const [[totalPacientes]] = await pool.query('SELECT COUNT(*) AS total FROM usuarios');
    const [citasPorEspecialidad] = await pool.query(`
      SELECT e.nombre AS especialidad, COUNT(*) AS total
      FROM citas c
      JOIN medicos m ON c.medico_id = m.id
      JOIN especialidades e ON m.especialidad_id = e.id
      GROUP BY e.nombre
    `);
    res.json({
      totalCitas: totalCitas.total,
      citasPendientes: citasPendientes.total,
      citasCompletadas: citasCompletadas.total,
      totalPacientes: totalPacientes.total,
      citasPorEspecialidad
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;