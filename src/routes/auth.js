const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

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

    if (tipo_documento === 'CE' && !/^[A-Za-z0-9]{1,12}$/.test(dni)) {
      return res.status(400).json({ error: 'El CE debe ser alfanumérico de hasta 12 caracteres' });
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
    res.json({ token, usuario: { id: rows[0].id, nombre: rows[0].nombre, email: rows[0].email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;