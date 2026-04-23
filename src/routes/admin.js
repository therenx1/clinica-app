const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { subirFotoMedico, eliminarFoto } = require('../spaces');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Formato no permitido. Usa JPG, PNG o WEBP'));
    }
    cb(null, true);
  }
});

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
        u.dni AS paciente_dni, u.tipo_documento AS paciente_tipo_doc,
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
    const estadosValidos = ['pendiente', 'confirmada', 'completada', 'cancelada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    await pool.query('UPDATE citas SET estado = ? WHERE id = ?', [estado, req.params.id]);
    res.json({ mensaje: 'Cita actualizada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pacientes', verificarAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, apellido, email, telefono, dni, tipo_documento, created_at FROM usuarios'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/medicos', verificarAdmin, async (req, res) => {
  try {
    const { incluir_inactivos } = req.query;
    const whereClause = incluir_inactivos === 'true' ? '' : 'WHERE m.activo = 1';
    const [rows] = await pool.query(`
      SELECT m.*, e.nombre AS especialidad
      FROM medicos m
      JOIN especialidades e ON m.especialidad_id = e.id
      ${whereClause}
      ORDER BY m.activo DESC, m.nombre ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/medicos/:id', verificarAdmin, async (req, res) => {
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

router.post('/medicos', verificarAdmin, upload.single('foto'), async (req, res) => {
  try {
    const { especialidad_id, nombre, apellido, email, telefono } = req.body;
    if (!especialidad_id || !nombre || !apellido) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    let foto_url = null;
    if (req.file) {
      foto_url = await subirFotoMedico(req.file.buffer, req.file.mimetype);
    }

    const [result] = await pool.query(
      'INSERT INTO medicos (especialidad_id, nombre, apellido, email, telefono, foto_url) VALUES (?,?,?,?,?,?)',
      [especialidad_id, nombre, apellido, email || null, telefono || null, foto_url]
    );
    res.json({ mensaje: 'Médico creado', id: result.insertId, foto_url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/medicos/:id', verificarAdmin, upload.single('foto'), async (req, res) => {
  try {
    const { especialidad_id, nombre, apellido, email, telefono } = req.body;

    const [actual] = await pool.query('SELECT foto_url FROM medicos WHERE id = ?', [req.params.id]);
    if (actual.length === 0) return res.status(404).json({ error: 'Médico no encontrado' });

    let foto_url = actual[0].foto_url;
    if (req.file) {
      foto_url = await subirFotoMedico(req.file.buffer, req.file.mimetype);
      if (actual[0].foto_url) await eliminarFoto(actual[0].foto_url);
    }

    await pool.query(
      'UPDATE medicos SET especialidad_id = ?, nombre = ?, apellido = ?, email = ?, telefono = ?, foto_url = ? WHERE id = ?',
      [especialidad_id, nombre, apellido, email || null, telefono || null, foto_url, req.params.id]
    );
    res.json({ mensaje: 'Médico actualizado', foto_url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/medicos/:id/estado', verificarAdmin, async (req, res) => {
  try {
    const { activo } = req.body;
    if (typeof activo !== 'boolean' && activo !== 0 && activo !== 1) {
      return res.status(400).json({ error: 'Valor de activo inválido' });
    }
    await pool.query('UPDATE medicos SET activo = ? WHERE id = ?', [activo ? 1 : 0, req.params.id]);
    res.json({ mensaje: `Médico ${activo ? 'activado' : 'desactivado'}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/medicos/:id', verificarAdmin, async (req, res) => {
  try {
    const [[citas]] = await pool.query('SELECT COUNT(*) AS total FROM citas WHERE medico_id = ?', [req.params.id]);
    if (citas.total > 0) {
      return res.status(409).json({
        error: 'No se puede eliminar: el médico tiene citas registradas',
        tieneCitas: true,
        totalCitas: citas.total
      });
    }

    const [medico] = await pool.query('SELECT foto_url FROM medicos WHERE id = ?', [req.params.id]);
    if (medico.length === 0) return res.status(404).json({ error: 'Médico no encontrado' });

    await pool.query('DELETE FROM medicos WHERE id = ?', [req.params.id]);
    if (medico[0].foto_url) await eliminarFoto(medico[0].foto_url);

    res.json({ mensaje: 'Médico eliminado permanentemente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/medicos/:id/horarios', verificarAdmin, async (req, res) => {
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

router.post('/medicos/:id/horarios', verificarAdmin, async (req, res) => {
  try {
    const { dia_semana, hora_inicio, hora_fin, duracion_min } = req.body;

    if (dia_semana === undefined || !hora_inicio || !hora_fin) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    if (dia_semana < 0 || dia_semana > 6) {
      return res.status(400).json({ error: 'Día de semana inválido (0-6)' });
    }
    if (hora_inicio >= hora_fin) {
      return res.status(400).json({ error: 'La hora de inicio debe ser menor a la hora fin' });
    }
    const duracion = duracion_min || 30;
    if (duracion < 10 || duracion > 180) {
      return res.status(400).json({ error: 'Duración debe estar entre 10 y 180 minutos' });
    }

    const [solapados] = await pool.query(
      `SELECT id FROM horarios 
       WHERE medico_id = ? AND dia_semana = ? 
       AND NOT (hora_fin <= ? OR hora_inicio >= ?)`,
      [req.params.id, dia_semana, hora_inicio, hora_fin]
    );
    if (solapados.length > 0) {
      return res.status(409).json({ error: 'El horario se cruza con otro existente' });
    }

    const [result] = await pool.query(
      'INSERT INTO horarios (medico_id, dia_semana, hora_inicio, hora_fin, duracion_min) VALUES (?,?,?,?,?)',
      [req.params.id, dia_semana, hora_inicio, hora_fin, duracion]
    );
    res.json({ mensaje: 'Horario creado', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/horarios/:id', verificarAdmin, async (req, res) => {
  try {
    const { dia_semana, hora_inicio, hora_fin, duracion_min } = req.body;

    if (dia_semana === undefined || !hora_inicio || !hora_fin) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    if (hora_inicio >= hora_fin) {
      return res.status(400).json({ error: 'La hora de inicio debe ser menor a la hora fin' });
    }

    const [actual] = await pool.query('SELECT medico_id FROM horarios WHERE id = ?', [req.params.id]);
    if (actual.length === 0) return res.status(404).json({ error: 'Horario no encontrado' });

    const [solapados] = await pool.query(
      `SELECT id FROM horarios 
       WHERE medico_id = ? AND dia_semana = ? AND id != ?
       AND NOT (hora_fin <= ? OR hora_inicio >= ?)`,
      [actual[0].medico_id, dia_semana, req.params.id, hora_inicio, hora_fin]
    );
    if (solapados.length > 0) {
      return res.status(409).json({ error: 'El horario se solapa con otro existente' });
    }

    await pool.query(
      'UPDATE horarios SET dia_semana = ?, hora_inicio = ?, hora_fin = ?, duracion_min = ? WHERE id = ?',
      [dia_semana, hora_inicio, hora_fin, duracion_min || 30, req.params.id]
    );
    res.json({ mensaje: 'Horario actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/horarios/:id', verificarAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM horarios WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Horario eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/especialidades', verificarAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM especialidades ORDER BY nombre');
    res.json(rows);
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