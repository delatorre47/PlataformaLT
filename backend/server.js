const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const app = express();

const USERS_FILE = './users.json';

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, '../frontend')));

// Utilidades
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  const data = fs.readFileSync(USERS_FILE);
  return data.length ? JSON.parse(data) : [];
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// 🔐 Registro
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();

  if (users.find(u => u.username === username)) {
    return res.status(409).send('El usuario ya existe');
  }

  users.push({ username, password, tasks: [] });
  writeUsers(users);
  res.status(201).send('Usuario registrado correctamente');
});

// 🔓 Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();

  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).send('Credenciales incorrectas');

  res.send('Login correcto');
});

// 📥 Obtener tareas del usuario
app.get('/tasks/:username', (req, res) => {
  const username = req.params.username;
  const users = readUsers();

  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).send('Usuario no encontrado');

  res.send(user.tasks);
});

// ➕ Añadir tarea
app.post('/tasks/:username', (req, res) => {
  const username = req.params.username;
  const { description } = req.body;

  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).send('Usuario no encontrado');

  const newTask = {
    id: Date.now().toString(),
    description,
    completed: false
  };

  user.tasks.push(newTask);
  writeUsers(users);
  res.status(201).send(newTask);
});

// ✅ Marcar tarea como completada
app.put('/tasks/:username/:id', (req, res) => {
  const { username, id } = req.params;
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).send('Usuario no encontrado');

  const task = user.tasks.find(t => t.id === id);
  if (!task) return res.status(404).send('Tarea no encontrada');

  task.completed = !task.completed;
  writeUsers(users);
  res.send(task);
});

// 🗑️ Eliminar tarea
app.delete('/tasks/:username/:id', (req, res) => {
  const { username, id } = req.params;
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).send('Usuario no encontrado');

  user.tasks = user.tasks.filter(t => t.id !== id);
  writeUsers(users);
  res.send({ success: true });
});

// 🌐 Servir interfaz
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/index.html'));
});

// 🚀 Iniciar servidor
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ PlataformaLT con usuarios activa en http://localhost:${PORT}`);
});
