const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const crypto = require('crypto');

const s3 = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET
  }
});

const BUCKET = process.env.DO_SPACES_BUCKET;
const CDN = process.env.DO_SPACES_CDN;

async function subirFotoMedico(buffer, mimetype) {
  const procesada = await sharp(buffer)
    .resize(400, 400, { fit: 'cover' })
    .jpeg({ quality: 85 })
    .toBuffer();
  const nombre = `medicos/${crypto.randomBytes(16).toString('hex')}.jpg`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: nombre,
    Body: procesada,
    ContentType: 'image/jpeg',
    ACL: 'public-read'
  }));
  return `${CDN}/${nombre}`;
}

async function subirFotoUsuario(buffer, mimetype) {
  const procesada = await sharp(buffer)
    .resize(400, 400, { fit: 'cover' })
    .jpeg({ quality: 85 })
    .toBuffer();
  const nombre = `usuarios/${crypto.randomBytes(16).toString('hex')}.jpg`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: nombre,
    Body: procesada,
    ContentType: 'image/jpeg',
    ACL: 'public-read'
  }));
  return `${CDN}/${nombre}`;
}

async function eliminarFoto(url) {
  if (!url || !url.startsWith(CDN)) return;
  const key = url.replace(`${CDN}/`, '');
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (error) {
    console.error('Error eliminando foto:', error.message);
  }
}

module.exports = { subirFotoMedico, subirFotoUsuario, eliminarFoto };
