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
const progressBar = document.getElementById('progressBar');
const filterButton = document.getElementById('filterButton');
let currentFilter = 'all';
const completedInfo = document.getElementById('completedInfo');
const feedback = document.createElement('div');
const passwordHint = document.getElementById('passwordHint');
const forgotLink = document.getElementById('forgotLink');
let loginAttempts = 0;



document.getElementById('regPass').addEventListener('input', (e) => {
  const value = e.target.value;
  const isValid = value.length >= 8 && /[a-zA-Z]/.test(value) && /\d/.test(value);

  passwordHint.style.color = isValid ? 'var(--success)' : '#f44336';
});


feedback.style.position = 'fixed';
feedback.style.bottom = '20px';
feedback.style.left = '50%';
feedback.style.transform = 'translateX(-50%)';
feedback.style.background = '#4da6ff';
feedback.style.color = '#fff';
feedback.style.padding = '10px 20px';
feedback.style.borderRadius = '8px';
feedback.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
feedback.style.fontSize = '0.95rem';
feedback.style.zIndex = '1000';
feedback.style.display = 'none';
document.body.appendChild(feedback);

function showFeedback(message) {
  feedback.textContent = message;
  feedback.style.display = 'block';
  feedback.style.opacity = '1';
  setTimeout(() => {
    feedback.style.transition = 'opacity 0.3s ease';
    feedback.style.opacity = '0';
    setTimeout(() => (feedback.style.display = 'none'), 300);
  }, 2000);
}

let currentUser = localStorage.getItem('usuario');
let allTasks = [];

if (currentUser) {
  showTaskSection();
  fetchTasks();
}

// ----------------- LOGIN -----------------
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPass').value;

  try {
    const res = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const errorMsg = await res.text();
      showFeedback(errorMsg);
    
      // Solo mostrar el enlace si el problema es la contraseña
      if (errorMsg.includes('contraseña')) {
        loginAttempts++;
        if (loginAttempts >= 1 && forgotLink) {
          forgotLink.style.display = 'block';
          forgotLink.classList.add('fade-in');
        }
      }
    
      return;
    }
    

    localStorage.setItem('usuario', email);
    currentUser = email;
    showTaskSection();
    fetchTasks();
    showFeedback('¡Inicio de sesión exitoso!');
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
  }
});

// ----------------- REGISTRO -----------------
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPass').value;

  const isValidPassword = password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
if (!isValidPassword) {
  showFeedback('La contraseña debe tener al menos 8 caracteres, incluyendo letras y números');
  return;
}

  try {
    const res = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (res.status === 409) {
      alert('El usuario ya existe');
      return;
    }

    showFeedback('Registro exitoso. Revisa tu correo para verificar la cuenta.');

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
    showFeedback('Tarea añadida.');
  } catch (err) {
    console.error('Error al añadir tarea:', err);
  }
});

// ----------------- FILTRO -----------------
filterButton.addEventListener('click', () => {
  if (currentFilter === 'all') currentFilter = 'completed';
  else if (currentFilter === 'completed') currentFilter = 'pending';
  else currentFilter = 'all';

  filterButton.textContent = `🔁 Filtro: ${currentFilter === 'all' ? 'Todas' : currentFilter === 'completed' ? 'Completadas' : 'Pendientes'}`;
  renderTasks();
});


// ----------------- MOSTRAR TAREAS -----------------
async function fetchTasks() {
  try {
    const res = await fetch(`${baseUrl}/tasks/${currentUser}`);
    allTasks = await res.json();
    renderTasks();
  } catch (err) {
    console.error('Error al obtener tareas:', err);
  }
}

function renderTasks() {
  taskList.innerHTML = '';
  const filter = currentFilter;
  const filteredTasks = allTasks.filter(task => {
    if (filter === 'completed') return task.completed;
    if (filter === 'pending') return !task.completed;
    return true;
  });

  filteredTasks.forEach(task => {
    const li = document.createElement('li');
    li.style.opacity = 0;
    li.style.transform = 'translateY(10px)';
    li.style.transition = 'all 0.3s ease';
    requestAnimationFrame(() => {
      li.style.opacity = 1;
      li.style.transform = 'translateY(0)';
    });

    if (task.completed) li.classList.add('completed');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => toggleComplete(task.id));

    const span = document.createElement('span');
    span.textContent = task.description;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.addEventListener('click', () => animateDeleteTask(li, task.id));

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });

  updateStats();
}

function updateStats() {
  const total = allTasks.length;
  const completed = allTasks.filter(t => t.completed).length;
  const pending = total - completed;
  const percentage = total ? (completed / total * 100).toFixed(0) : 0;
  progressBar.style.width = `${percentage}%`;
  completedInfo.textContent = `${completed} de ${total} completadas`;
}

// ----------------- COMPLETAR TAREA -----------------
async function toggleComplete(id) {
  try {
    await fetch(`${baseUrl}/tasks/${currentUser}/${id}`, { method: 'PUT' });
    fetchTasks();
    showFeedback('Estado de tarea actualizado.');
  } catch (err) {
    console.error('Error al completar tarea:', err);
  }
}

// ----------------- ANIMACIÓN Y ELIMINAR TAREA -----------------
function animateDeleteTask(element, id) {
  element.style.transition = 'all 0.3s ease';
  element.style.opacity = '0';
  element.style.transform = 'translateX(50px)';
  setTimeout(() => deleteTask(id), 300);
}

async function deleteTask(id) {
  try {
    await fetch(`${baseUrl}/tasks/${currentUser}/${id}`, { method: 'DELETE' });
    fetchTasks();
    showFeedback('Tarea eliminada.');
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
  showFeedback('Sesión cerrada.');
}

// ----------------- MOSTRAR INTERFAZ DE TAREAS -----------------
function showTaskSection() {
  authSection.style.display = 'none';
  taskSection.style.display = 'block';
  activeUserSpan.textContent = currentUser;
}

