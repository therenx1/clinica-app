const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.*, e.nombre AS especialidad
      FROM medicos m
      JOIN especialidades e ON m.especialidad_id = e.id
      WHERE m.activo = 1
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.*, e.nombre AS especialidad
      FROM medicos m
      JOIN especialidades e ON m.especialidad_id = e.id
      WHERE m.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Médico no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/horarios', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM horarios WHERE medico_id = ?',
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;