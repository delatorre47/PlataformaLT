const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const baseUrl = isLocal ? 'http://localhost:3000' : window.location.origin;


const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');
const authSection = document.getElementById('authSection');
const taskSection = document.getElementById('taskSection');
const activeUserSpan = document.getElementById('activeUser');

let currentUser = localStorage.getItem('usuario');

if (currentUser) {
  showTaskSection();
  fetchTasks();
}

// ----------------- LOGIN -----------------
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUser').value;
  const password = document.getElementById('loginPass').value;

  try {
    const res = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      alert('Usuario o contraseña incorrectos');
      return;
    }

    localStorage.setItem('usuario', username);
    currentUser = username;
    showTaskSection();
    fetchTasks();
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
  }
});

// ----------------- REGISTRO -----------------
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('regUser').value;
  const password = document.getElementById('regPass').value;

  try {
    const res = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (res.status === 409) {
      alert('El usuario ya existe');
      return;
    }

    alert('Registro correcto. Ahora puedes iniciar sesión.');
  } catch (err) {
    console.error('Error al registrar usuario:', err);
  }
});

// ----------------- AÑADIR TAREA -----------------
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const description = taskInput.value;

  try {
    await fetch(`${baseUrl}/tasks/${currentUser}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description })
    });

    taskInput.value = '';
    fetchTasks();
  } catch (err) {
    console.error('Error al añadir tarea:', err);
  }
});

// ----------------- MOSTRAR TAREAS -----------------
async function fetchTasks() {
  try {
    const res = await fetch(`${baseUrl}/tasks/${currentUser}`);
    const tasks = await res.json();
    taskList.innerHTML = '';

    tasks.forEach(task => {
      const li = document.createElement('li');
      if (task.completed) li.classList.add('completed');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => toggleComplete(task.id));

      const span = document.createElement('span');
      span.textContent = task.description;

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️';
      deleteBtn.addEventListener('click', () => deleteTask(task.id));

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(deleteBtn);
      taskList.appendChild(li);
    });
  } catch (err) {
    console.error('Error al obtener tareas:', err);
  }
}

// ----------------- COMPLETAR TAREA -----------------
async function toggleComplete(id) {
  try {
    await fetch(`${baseUrl}/tasks/${currentUser}/${id}`, { method: 'PUT' });
    fetchTasks();
  } catch (err) {
    console.error('Error al completar tarea:', err);
  }
}

// ----------------- ELIMINAR TAREA -----------------
async function deleteTask(id) {
  try {
    await fetch(`${baseUrl}/tasks/${currentUser}/${id}`, { method: 'DELETE' });
    fetchTasks();
  } catch (err) {
    console.error('Error al eliminar tarea:', err);
  }
}

// ----------------- CERRAR SESIÓN -----------------
function logout() {
  localStorage.removeItem('usuario');
  currentUser = null;
  authSection.style.display = 'block';
  taskSection.style.display = 'none';
  taskList.innerHTML = '';
}

// ----------------- MOSTRAR INTERFAZ DE TAREAS -----------------
function showTaskSection() {
  authSection.style.display = 'none';
  taskSection.style.display = 'block';
  activeUserSpan.textContent = currentUser;
}
