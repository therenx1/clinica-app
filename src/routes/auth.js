const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const pool = require('../db');
const { subirFotoUsuario, eliminarFoto } = require('../spaces');

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

router.post('/register', async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono, dni, tipo_documento = 'DNI' } = req.body;
    if (!nombre || !apellido || !email || !password || !dni) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    if (!['DNI', 'CE'].includes(tipo_documento)) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }
    if (tipo_documento === 'DNI' && !/^\d{8}$/.test(dni)) {
      return res.status(400).json({ error: 'El DNI debe tener exactamente 8 dígitos' });
    }
    if (tipo_documento === 'CE' && !/^\d{9}$/.test(dni)) {
      return res.status(400).json({ error: 'El CE debe tener exactamente 9 dígitos' });
    }
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, apellido, email, password, telefono, dni, tipo_documento) VALUES (?,?,?,?,?,?,?)',
      [nombre, apellido, email, hash, telefono, dni, tipo_documento]
    );
    res.json({ mensaje: 'Usuario registrado', id: result.insertId });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El email o documento ya está registrado' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });
    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });
    const token = jwt.sign({ id: rows[0].id, email: rows[0].email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      usuario: {
        id: rows[0].id,
        nombre: rows[0].nombre,
        apellido: rows[0].apellido,
        email: rows[0].email,
        dni: rows[0].dni,
        tipo_documento: rows[0].tipo_documento,
        telefono: rows[0].telefono,
        foto_url: rows[0].foto_url
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/perfil', verificarToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, apellido, email, dni, tipo_documento, telefono, foto_url FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/foto', verificarToken, upload.single('foto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ninguna foto' });
    }

    const [actual] = await pool.query('SELECT foto_url FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (actual.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const nuevaUrl = await subirFotoUsuario(req.file.buffer, req.file.mimetype);
    await pool.query('UPDATE usuarios SET foto_url = ? WHERE id = ?', [nuevaUrl, req.usuario.id]);

    if (actual[0].foto_url) await eliminarFoto(actual[0].foto_url);

    res.json({ mensaje: 'Foto actualizada', foto_url: nuevaUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
