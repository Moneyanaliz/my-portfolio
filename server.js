const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Простое хранилище в JSON файле
const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'messages.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify({ messages: [] }));

function readDB() {
  return JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
}
function writeDB(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

// POST /api/contact
app.post('/api/contact', (req, res) => {
  const { name, topic, message } = req.body;
  if (!message || message.trim().length < 5)
    return res.status(400).json({ ok: false, errors: ['Сообщение слишком короткое'] });

  try {
    const db = readDB();
    const newMsg = {
      id: Date.now(),
      name: (name || '').trim() || 'Аноним',
      topic: topic || 'other',
      message: message.trim(),
      read: false,
      created_at: new Date().toISOString()
    };
    db.messages.push(newMsg);
    writeDB(db);
    res.json({ ok: true, id: newMsg.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, errors: ['Ошибка сервера'] });
  }
});

// GET /api/messages
app.get('/api/messages', (req, res) => {
  const db = readDB();
  res.json({ ok: true, messages: [...db.messages].reverse() });
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
});
