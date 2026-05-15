const express = require('express');
const Database = require('better-sqlite3');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const crypto = require('crypto');
const activeTokens = new Set();

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// --- Multer config for file uploads ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|mov/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext || mime) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes y videos'));
    }
  }
});

// --- Database Setup ---
const db = new Database(path.join(__dirname, 'prisma.db'));
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price TEXT NOT NULL,
    benefits TEXT,
    badge TEXT,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    media_type TEXT NOT NULL DEFAULT 'image',
    media_url TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS individual_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );
`);

// Seed admin user if none exists
const adminExists = db.prepare('SELECT COUNT(*) as count FROM admin').get();
if (adminExists.count === 0) {
  const hashedPassword = bcrypt.hashSync('prisma2026', 10);
  db.prepare('INSERT INTO admin (username, password) VALUES (?, ?)').run('admin', hashedPassword);
  console.log('Admin user created: admin / prisma2026');
}

// Seed plans if none exist
const plansExist = db.prepare('SELECT COUNT(*) as count FROM plans').get();
if (plansExist.count === 0) {
  const seedPlans = db.prepare(`INSERT INTO plans (name, description, price, benefits, badge, sort_order) VALUES (?, ?, ?, ?, ?, ?)`);

  seedPlans.run(
    'Plan Básico',
    'Ideal para emprendedores y negocios que inician su presencia digital. Incluye gestión básica de redes sociales y diseño de contenido.',
    'L. 3,500/mes',
    JSON.stringify([
      'Gestión de 2 redes sociales',
      '12 publicaciones mensuales',
      'Diseño gráfico básico',
      'Reportes mensuales',
      'Soporte por WhatsApp'
    ]),
    'Popular',
    1
  );

  seedPlans.run(
    'Plan Intermedio',
    'Para negocios en crecimiento que buscan mayor alcance y engagement. Incluye estrategias de contenido avanzadas y pauta publicitaria.',
    'L. 6,500/mes',
    JSON.stringify([
      'Gestión de 3 redes sociales',
      '20 publicaciones mensuales',
      'Diseño gráfico profesional',
      'Estrategia de contenido',
      'Pauta publicitaria básica',
      'Reportes quincenales',
      'Stories y Reels',
      'Soporte prioritario'
    ]),
    'Recomendado',
    2
  );

  seedPlans.run(
    'Plan Avanzado',
    'Solución completa para empresas que buscan dominar el marketing digital. Incluye SEO, email marketing y gestión avanzada de campañas.',
    'L. 12,000/mes',
    JSON.stringify([
      'Gestión de 4 redes sociales',
      '30 publicaciones mensuales',
      'Diseño gráfico premium',
      'Estrategia de contenido avanzada',
      'Pauta publicitaria avanzada',
      'SEO básico',
      'Email marketing',
      'Reportes semanales',
      'Producción de Reels/TikToks',
      'Community management',
      'Soporte 24/7'
    ]),
    '',
    3
  );

  seedPlans.run(
    'Plan Premium',
    'El paquete completo para marcas que buscan resultados extraordinarios. Todo incluido con atención personalizada y estrategias a medida.',
    'L. 20,000/mes',
    JSON.stringify([
      'Gestión ilimitada de redes',
      'Publicaciones ilimitadas',
      'Branding completo',
      'Estrategia 360°',
      'Campañas publicitarias completas',
      'SEO avanzado',
      'Email marketing automatizado',
      'Producción audiovisual',
      'Sesiones de fotos mensuales',
      'Consultoría personalizada',
      'Analítica avanzada',
      'Soporte dedicado 24/7',
      'Gestión de influencers'
    ]),
    'Premium',
    4
  );

  console.log('Plans seeded successfully');
}

// Seed individual prices if none exist
const pricesExist = db.prepare('SELECT COUNT(*) as count FROM individual_prices').get();
if (pricesExist.count === 0) {
  const seedPrices = db.prepare('INSERT INTO individual_prices (name, description, price, sort_order) VALUES (?, ?, ?, ?)');
  seedPrices.run('Diseño de Logotipo', 'Creación de identidad visual única con manual de marca básico.', 'L. 4,500', 1);
  seedPrices.run('Sesión de Fotografía', 'Sesión de 2 horas en locación, entrega de 30 fotos editadas.', 'L. 3,000', 2);
  seedPrices.run('Video Promocional', 'Grabación y edición de un video de 60 segundos para redes sociales.', 'L. 5,000', 3);
  seedPrices.run('Gestión de Campaña Ads', 'Configuración y optimización de pauta en Facebook/Instagram (No incluye presupuesto publicitario).', 'L. 3,500/mes', 4);
  console.log('Individual prices seeded successfully');
}

// --- Auth Middleware ---
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (token && activeTokens.has(token)) {
    next();
  } else {
    res.status(401).json({ error: 'No autorizado' });
  }
}

// --- API Routes ---

// Auth
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username);
  if (admin && bcrypt.compareSync(password, admin.password)) {
    const token = crypto.randomBytes(32).toString('hex');
    activeTokens.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Credenciales incorrectas' });
  }
});

app.post('/api/logout', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) activeTokens.delete(token);
  res.json({ success: true });
});

app.get('/api/auth/check', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token && activeTokens.has(token)) {
    res.json({ isAdmin: true });
  } else {
    res.json({ isAdmin: false });
  }
});

// Plans - Public
app.get('/api/plans', (req, res) => {
  const plans = db.prepare('SELECT * FROM plans ORDER BY sort_order ASC').all();
  plans.forEach(p => {
    try { p.benefits = JSON.parse(p.benefits); } catch { p.benefits = []; }
  });
  res.json(plans);
});

// Plans - Admin
app.post('/api/plans', requireAuth, (req, res) => {
  const { name, description, price, benefits, badge, sort_order } = req.body;
  const result = db.prepare(
    'INSERT INTO plans (name, description, price, benefits, badge, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, description, price, JSON.stringify(benefits || []), badge || '', sort_order || 0);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/plans/:id', requireAuth, (req, res) => {
  const { name, description, price, benefits, badge, sort_order } = req.body;
  db.prepare(
    'UPDATE plans SET name=?, description=?, price=?, benefits=?, badge=?, sort_order=? WHERE id=?'
  ).run(name, description, price, JSON.stringify(benefits || []), badge || '', sort_order || 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/plans/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM plans WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Individual Prices - Public
app.get('/api/prices', (req, res) => {
  const prices = db.prepare('SELECT * FROM individual_prices ORDER BY sort_order ASC').all();
  res.json(prices);
});

// Individual Prices - Admin
app.post('/api/prices', requireAuth, (req, res) => {
  const { name, description, price, sort_order } = req.body;
  const result = db.prepare(
    'INSERT INTO individual_prices (name, description, price, sort_order) VALUES (?, ?, ?, ?)'
  ).run(name, description, price, sort_order || 0);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/prices/:id', requireAuth, (req, res) => {
  const { name, description, price, sort_order } = req.body;
  db.prepare(
    'UPDATE individual_prices SET name=?, description=?, price=?, sort_order=? WHERE id=?'
  ).run(name, description, price, sort_order || 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/prices/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM individual_prices WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Portfolio - Public
app.get('/api/portfolio', (req, res) => {
  const items = db.prepare('SELECT * FROM portfolio ORDER BY created_at DESC').all();
  res.json(items);
});

// Portfolio - Admin
app.post('/api/portfolio', requireAuth, upload.single('media'), (req, res) => {
  const { title, description, media_type, category, video_url } = req.body;

  let media_url;
  if (media_type === 'video' && video_url) {
    media_url = video_url;
  } else if (req.file) {
    media_url = '/uploads/' + req.file.filename;
  } else {
    return res.status(400).json({ error: 'Archivo requerido' });
  }

  const result = db.prepare(
    'INSERT INTO portfolio (title, description, media_type, media_url, category) VALUES (?, ?, ?, ?, ?)'
  ).run(title, description, media_type || 'image', media_url, category || 'general');
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/portfolio/:id', requireAuth, upload.single('media'), (req, res) => {
  const { title, description, media_type, category, video_url } = req.body;
  const existing = db.prepare('SELECT * FROM portfolio WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'No encontrado' });

  let media_url = existing.media_url;
  if (media_type === 'video' && video_url) {
    media_url = video_url;
  } else if (req.file) {
    // Delete old file if it was a local upload
    if (existing.media_url.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, existing.media_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    media_url = '/uploads/' + req.file.filename;
  }

  db.prepare(
    'UPDATE portfolio SET title=?, description=?, media_type=?, media_url=?, category=? WHERE id=?'
  ).run(title, description, media_type || 'image', media_url, category || 'general', req.params.id);
  res.json({ success: true });
});

app.delete('/api/portfolio/:id', requireAuth, (req, res) => {
  const item = db.prepare('SELECT * FROM portfolio WHERE id = ?').get(req.params.id);
  if (item && item.media_url.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, item.media_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.prepare('DELETE FROM portfolio WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// API 404 fallback (must be before HTML fallback)
app.use('/api/{*path}', (req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Friendly admin URL
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve main page for all non-API routes (SPA)
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`\n✨ Prisma MKT server running at http://localhost:${PORT}\n`);
  console.log(`   Admin panel: http://localhost:${PORT}/admin`);
  console.log(`   Admin panel direct: http://localhost:${PORT}/admin.html`);
  console.log(`   Credentials: admin / prisma2026\n`);
});
