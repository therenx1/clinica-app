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
      'SELECT * FROM horarios WHERE medico_id = ? ORDER BY dia_semana, hora_inicio',
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/slots-disponibles', async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'Fecha requerida en formato YYYY-MM-DD' });
    }

    const fechaObj = new Date(fecha + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fechaObj < hoy) {
      return res.status(400).json({ error: 'No se pueden consultar fechas pasadas' });
    }

    const diaSemana = fechaObj.getDay();

    const [horarios] = await pool.query(
      'SELECT * FROM horarios WHERE medico_id = ? AND dia_semana = ?',
      [req.params.id, diaSemana]
    );

    if (horarios.length === 0) {
      return res.json({ fecha, dia_semana: diaSemana, slots: [] });
    }

    const [citasOcupadas] = await pool.query(
      `SELECT TIME_FORMAT(hora, '%H:%i:%s') AS hora FROM citas 
       WHERE medico_id = ? AND fecha = ? AND estado IN ('pendiente', 'confirmada', 'completada')`,
      [req.params.id, fecha]
    );
    const horasOcupadas = new Set(citasOcupadas.map(c => c.hora));

    const ahora = new Date();
    const esHoy = fechaObj.toDateString() === ahora.toDateString();

    const slots = [];
    for (const h of horarios) {
      const [hIni, mIni] = h.hora_inicio.split(':').map(Number);
      const [hFin, mFin] = h.hora_fin.split(':').map(Number);
      let minutos = hIni * 60 + mIni;
      const limite = hFin * 60 + mFin;

      while (minutos + h.duracion_min <= limite) {
        const hora = String(Math.floor(minutos / 60)).padStart(2, '0');
        const min = String(minutos % 60).padStart(2, '0');
        const slotStr = `${hora}:${min}:00`;

        let disponible = !horasOcupadas.has(slotStr);
        if (esHoy && disponible) {
          const slotDate = new Date(fechaObj);
          slotDate.setHours(parseInt(hora), parseInt(min), 0, 0);
          if (slotDate <= ahora) disponible = false;
        }

        if (disponible) {
          slots.push({ hora: `${hora}:${min}`, duracion_min: h.duracion_min });
        }
        minutos += h.duracion_min;
      }
    }

    res.json({ fecha, dia_semana: diaSemana, slots });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;