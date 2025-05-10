const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const app = express();
const USERS_FILE = './users.json';
const isProduction = process.env.NODE_ENV === 'production';
const publicURL = isProduction ? 'https://plataformalt.onrender.com' : `http://${localIp}:3000`;


const os = require('os');
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (
        iface.family === 'IPv4' &&
        !iface.internal &&
        iface.address.startsWith('192.168.') &&  // Solo red local real
        !iface.address.startsWith('192.168.56.') // Excluye VirtualBox, por ejemplo
      ) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp(); // ← Usaremos esto para los enlaces móviles
console.log(`🌐 IP local detectada: ${localIp}`);



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
const crypto = require('crypto');

app.post('/register', (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();

  if (users.find(u => u.email === email)) {
    return res.status(409).send('El usuario ya existe');
  }

  const token = crypto.randomBytes(16).toString('hex');
  const newUser = { email, password, tasks: [], verified: false, token };
  users.push(newUser);
  writeUsers(users);

  sendVerificationEmail(email, token)
    .then(() => res.status(201).send('Registro exitoso. Revisa tu correo para verificar la cuenta.'))
    .catch(err => {
      console.error('Error al enviar el correo:', err);
      res.status(500).send('No se pudo enviar el correo de verificación');
    });
});


// 🔓 Login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).send('Correo electrónico no registrado');
  }

  if (user.password !== password) {
    return res.status(401).send('La contraseña es incorrecta');
  }

  if (!user.verified) {
    return res.status(403).send('Cuenta no verificada. Revisa tu correo para activarla.');
  }

  res.send('Login correcto');
});

// 📥 Obtener tareas del usuario
app.get('/tasks/:email', (req, res) => {
  const email = req.params.email;
  const users = readUsers();

  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).send('Usuario no encontrado');

  res.send(user.tasks);
});

// ➕ Añadir tarea
app.post('/tasks/:email', (req, res) => {
  const email = req.params.email;
  const { description } = req.body;

  const users = readUsers();
  const user = users.find(u => u.email === email);
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
app.put('/tasks/:email/:id', (req, res) => {
  const users = readUsers();
  const { email, id } = req.params;
  const user = users.find(u => u.email === email);

  if (!user) return res.status(404).send('Usuario no encontrado');

  const task = user.tasks.find(t => t.id === id);
  if (!task) return res.status(404).send('Tarea no encontrada');

  task.completed = !task.completed;
  writeUsers(users);
  res.send(task);
});

// 🗑️ Eliminar tarea
app.delete('/tasks/:email/:id', (req, res) => {
  const { email, id } = req.params;
  const users = readUsers();
  const user = users.find(u => u.email === email);
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

//Enviar mails
const nodemailer = require('nodemailer');

// Configura tu transporte de email (Gmail en este ejemplo)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'danieldelatorregordon@gmail.com',
    pass: 'nrkh fyrq fmso qzvv'
  }
});

function sendVerificationEmail(email, token) {
  const linkPC = `http://localhost:3000/verify?token=${token}`;
  const linkMobile = `http://${localIp}:3000/verify?token=${token}`;
  const linkPublic = `${publicURL}/verify?token=${token}`; // 🔧

  const mailOptions = {
    from: 'danieldelatorregordon@gmail.com',
    to: email,
    subject: 'Verifica tu cuenta',
    html: `
      <p>Haz clic para verificar tu cuenta:</p>
      <ul>
        <li>Desde el <strong>ordenador</strong>: <a href="${linkPC}">${linkPC}</a></li>
        <li>Desde el <strong>móvil</strong>: <a href="${linkMobile}">${linkMobile}</a></li>
        <li><strong>Acceso público (Render):</strong> <a href="${linkPublic}">${linkPublic}</a></li>
      </ul>
    `
  };

  return transporter.sendMail(mailOptions);
}


//VERIFICACIÓN
app.get('/verify', (req, res) => {
  const { token } = req.query;
  const users = readUsers();

  const user = users.find(u => u.token === token);

  if (!user) {
    return res.send(`
      <h2>❌ Enlace inválido o expirado</h2>
      <p>Por favor, regístrate de nuevo para recibir otro correo.</p>
      <script>
        setTimeout(() => {
          window.location.href = '/';
        }, 4000);
      </script>
    `);
  }

  if (user.verified) {
    return res.send(`
      <h2>✅ Tu cuenta ya estaba verificada</h2>
      <p>Serás redirigido a la plataforma para iniciar sesión...</p>
      <script>
        setTimeout(() => {
          window.location.href = '/';
        }, 4000);
      </script>
    `);
  }

  user.verified = true;
  delete user.token;
  writeUsers(users);

  res.send(`
    <h2>✅ Cuenta verificada con éxito</h2>
    <p>Redirigiendo a la plataforma para que inicies sesión...</p>
    <script>
      setTimeout(() => {
        window.location.href = '/';
      }, 4000);
    </script>
  `);
});

//CAMBIO DE CONTRASEÑA
app.put('/change-password', (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  const users = readUsers();

  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).send('Usuario no encontrado');

  if (user.password !== oldPassword) {
    return res.status(401).send('La contraseña actual es incorrecta');
  }

  const isValidPassword = newPassword.length >= 8 && /[a-zA-Z]/.test(newPassword) && /\d/.test(newPassword);
  if (!isValidPassword) {
    return res.status(400).send('La nueva contraseña debe tener al menos 8 caracteres, incluyendo letras y números');
  }

  user.password = newPassword;
  writeUsers(users);
  res.send('Contraseña actualizada correctamente');
});

//RECUPERAR CONTRASEÑA
function sendPasswordRecoveryEmail(email, token) {
  const linkPC = `http://localhost:3000/recuperar-reset.html?token=${token}`;
  const linkMobile = `http://${localIp}:3000/recuperar-reset.html?token=${token}`;
  const linkPublic = `${publicURL}/recuperar-reset.html?token=${token}`;

  const mailOptions = {
    from: 'danieldelatorregordon@gmail.com',
    to: email,
    subject: 'Recuperación de contraseña',
    html: `
      <p>Haz clic para restablecer tu contraseña:</p>
      <ul>
        <li><strong>Desde el ordenador:</strong> <a href="${linkPC}">${linkPC}</a></li>
        <li><strong>Desde el móvil:</strong> <a href="${linkMobile}">${linkMobile}</a></li>
        <li><strong>Acceso público (Render):</strong> <a href="${linkPublic}">${linkPublic}</a></li>
      </ul>
    `
  };

  return transporter.sendMail(mailOptions);
}


app.post('/recover-password', (req, res) => {
  const { email } = req.body;
  const users = readUsers();

  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).send('No existe ninguna cuenta con ese correo');

  const token = crypto.randomBytes(16).toString('hex');
  user.recoveryToken = token;
  writeUsers(users);

  sendPasswordRecoveryEmail(email, token)
    .then(() => res.send('Enlace de recuperación enviado. Revisa tu correo.'))
    .catch((err) => {
      console.error('Error al enviar email de recuperación:', err);
      res.status(500).send('Error al enviar el email');
    });
});

app.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  const users = readUsers();

  const user = users.find(u => u.recoveryToken === token);
  if (!user) return res.status(400).send('Token inválido o expirado');

  const isValidPassword = newPassword.length >= 8 && /[a-zA-Z]/.test(newPassword) && /\d/.test(newPassword);
  if (!isValidPassword) {
    return res.status(400).send('La nueva contraseña no cumple los requisitos de seguridad');
  }

  if (user.password === newPassword) {
    return res.status(400).send('La nueva contraseña no puede ser igual a la actual');
  }
  
  user.password = newPassword;
  delete user.recoveryToken;
  writeUsers(users);
  
  res.send('Contraseña actualizada con éxito. Ya puedes iniciar sesión.');
});

//CAMBIO DE EMAIL
function sendEmailChangeVerification(to, token) {
  const linkPC = `http://localhost:3000/verify-email-change.html?token=${token}`;
  const linkMobile = `http://${localIp}:3000/verify-email-change.html?token=${token}`;
  const linkPublic = `${publicURL}/verify-email-change.html?token=${token}`;

  const mailOptions = {
    from: 'danieldelatorregordon@gmail.com',
    to,
    subject: 'Verifica tu nuevo correo',
    html: `
      <p>Haz clic para confirmar el cambio de correo:</p>
      <ul>
        <li><strong>Desde el ordenador:</strong> <a href="${linkPC}">${linkPC}</a></li>
        <li><strong>Desde el móvil:</strong> <a href="${linkMobile}">${linkMobile}</a></li>
        <li><strong>Acceso público (Render):</strong> <a href="${linkPublic}">${linkPublic}</a></li>
      </ul>
    `
  };

  return transporter.sendMail(mailOptions);
}


app.post('/request-email-change', (req, res) => {
  const { oldEmail, newEmail, password } = req.body;
  const users = readUsers();

  const user = users.find(u => u.email === oldEmail);
  if (!user) return res.status(404).send('Usuario no encontrado');

  if (user.password !== password) {
    return res.status(401).send('Contraseña incorrecta');
  }

  if (users.find(u => u.email === newEmail)) {
    return res.status(409).send('El nuevo correo ya está en uso');
  }

  const token = crypto.randomBytes(16).toString('hex');
  user.pendingEmail = newEmail;
  user.emailChangeToken = token;
  writeUsers(users);

  sendEmailChangeVerification(newEmail, token)
    .then(() => res.send('Correo de verificación enviado. Revisa tu nuevo email para confirmar el cambio.'))
    .catch((err) => {
      console.error('Error al enviar el correo:', err);
      res.status(500).send('Error al enviar el correo de verificación');
    });
});

app.get('/verify-email-change', (req, res) => {
  const { token } = req.query;
  const users = readUsers();

  const user = users.find(u => u.emailChangeToken === token);
  if (!user) {
    return res.status(400).send('Token inválido o expirado');
  }

  const newEmail = user.pendingEmail;
  if (!newEmail) {
    return res.status(400).send('No se encontró el nuevo correo pendiente');
  }

  // Asegurarse de que el nuevo email no esté ya en uso
  if (users.find(u => u.email === newEmail)) {
    return res.status(409).send('El nuevo correo ya está registrado por otro usuario');
  }

  user.email = newEmail;
  delete user.pendingEmail;
  delete user.emailChangeToken;
  writeUsers(users);

  res.send(`OK:${user.email}`);
});