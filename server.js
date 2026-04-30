const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // отдаёт index.html

// БД
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new Database(path.join(dataDir, 'messages.db'));

// Создаём таблицу если нет
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT,
    topic     TEXT,
    message   TEXT NOT NULL,
    read      INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )
`);

// ─── Валидация ───────────────────────────────────────────────────────────────
function validate({ name, topic, message }) {
  const errors = [];
  if (!message || message.trim().length < 5)
    errors.push('Сообщение слишком короткое (минимум 5 символов)');
  if (message && message.trim().length > 2000)
    errors.push('Сообщение слишком длинное (максимум 2000 символов)');
  if (name && name.trim().length > 100)
    errors.push('Имя слишком длинное');
  return errors;
}

// ─── POST /api/contact ───────────────────────────────────────────────────────
app.post('/api/contact', (req, res) => {
  const { name, topic, message } = req.body;

  const errors = validate({ name, topic, message });
  if (errors.length > 0) {
    return res.status(400).json({ ok: false, errors });
  }

  try {
    const stmt = db.prepare(
      'INSERT INTO messages (name, topic, message) VALUES (?, ?, ?)'
    );
    const result = stmt.run(
      (name || '').trim() || 'Аноним',
      topic || 'other',
      message.trim()
    );
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, errors: ['Ошибка сервера'] });
  }
});

// ─── GET /api/messages (просмотр сообщений) ──────────────────────────────────
app.get('/api/messages', (req, res) => {
  const rows = db.prepare('SELECT * FROM messages ORDER BY id DESC').all();
  res.json({ ok: true, messages: rows });
});

// ─── DELETE /api/messages/:id ────────────────────────────────────────────────
app.delete('/api/messages/:id', (req, res) => {
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── PATCH /api/messages/:id/read ────────────────────────────────────────────
app.patch('/api/messages/:id/read', (req, res) => {
  db.prepare('UPDATE messages SET read = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Запуск ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
  console.log(`📋 Сообщения:      http://localhost:${PORT}/api/messages`);
});
