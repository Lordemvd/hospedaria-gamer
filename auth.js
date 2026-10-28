// ==========================================
// GERENCIADOR DE AUTENTICAÇÃO NEXUS INN
// ==========================================
const USERS_STORAGE_KEY = 'nexus_users';
const CURRENT_USER_KEY = 'nexus_current_user';

// Retorna lista de usuários cadastrados
function getRegisteredUsers() {
  try {
    const data = localStorage.getItem(USERS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

// Cadastra um novo jogador com validações
function registerUser(userData) {
  const users = getRegisteredUsers();

  const emailExists = users.some(u => u.email.toLowerCase() === userData.email.trim().toLowerCase());
  if (emailExists) {
    return { success: false, message: 'Este e-mail já está em uso por outro jogador.' };
  }

  const tagExists = users.some(u => u.gamerTag.toLowerCase() === userData.gamerTag.trim().toLowerCase());
  if (tagExists) {
    return { success: false, message: 'Esta GamerTag já foi resgatada por outro player.' };
  }

  const newUser = {
    id: 'usr_' + Date.now(),
    fullName: userData.fullName.trim(),
    gamerTag: userData.gamerTag.trim(),
    email: userData.email.trim().toLowerCase(),
    cpf: userData.cpf.trim(),
    password: userData.password,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

  // Inicia sessão automaticamente após cadastro
  const sessionUser = {
    id: newUser.id,
    fullName: newUser.fullName,
    gamerTag: newUser.gamerTag,
    email: newUser.email
  };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));

  return { success: true, user: sessionUser };
}

// Autentica o jogador via e-mail ou GamerTag
function loginUser(identifier, password) {
  const users = getRegisteredUsers();
  const cleanId = identifier.trim().toLowerCase();

  const foundUser = users.find(u => 
    (u.email.toLowerCase() === cleanId || u.gamerTag.toLowerCase() === cleanId) &&
    u.password === password
  );

  if (!foundUser) {
    return { success: false, message: 'E-mail/GamerTag ou senha incorretos.' };
  }

  const sessionUser = {
    id: foundUser.id,
    fullName: foundUser.fullName,
    gamerTag: foundUser.gamerTag,
    email: foundUser.email
  };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));

  return { success: true, user: sessionUser };
}

// Retorna o jogador logado no momento
function getCurrentUser() {
  try {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

// Encerra a sessão
function logoutUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
  window.location.reload();
}