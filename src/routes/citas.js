const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

router.post('/', verificarToken, async (req, res) => {
  try {
    const { medico_id, fecha, hora, motivo } = req.body;
    const [result] = await pool.query(
      'INSERT INTO citas (usuario_id, medico_id, fecha, hora, motivo) VALUES (?,?,?,?,?)',
      [req.usuario.id, medico_id, fecha, hora, motivo]
    );
    await pool.query(
      'INSERT INTO notificaciones (usuario_id, cita_id, mensaje) VALUES (?,?,?)',
      [req.usuario.id, result.insertId, `Tu cita fue agendada para el ${fecha} a las ${hora}`]
    );
    res.json({ mensaje: 'Cita agendada', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/mis-citas', verificarToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, m.nombre AS medico_nombre, m.apellido AS medico_apellido, e.nombre AS especialidad
      FROM citas c
      JOIN medicos m ON c.medico_id = m.id
      JOIN especialidades e ON m.especialidad_id = e.id
      WHERE c.usuario_id = ?
      ORDER BY c.fecha DESC, c.hora DESC
    `, [req.usuario.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/cancelar', verificarToken, async (req, res) => {
  try {
    const [cita] = await pool.query(
      'SELECT * FROM citas WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.usuario.id]
    );
    if (cita.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });
    await pool.query(
      'UPDATE citas SET estado = ? WHERE id = ?',
      ['cancelada', req.params.id]
    );
    res.json({ mensaje: 'Cita cancelada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/notificaciones', verificarToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT n.*,
             c.estado AS cita_estado,
             c.fecha AS cita_fecha,
             c.hora AS cita_hora,
             c.motivo AS cita_motivo,
             c.medico_id AS cita_medico_id,
             m.nombre AS medico_nombre,
             m.apellido AS medico_apellido,
             e.nombre AS especialidad
      FROM notificaciones n
      LEFT JOIN citas c ON n.cita_id = c.id
      LEFT JOIN medicos m ON c.medico_id = m.id
      LEFT JOIN especialidades e ON m.especialidad_id = e.id
      WHERE n.usuario_id = ?
      ORDER BY n.created_at DESC
    `, [req.usuario.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
