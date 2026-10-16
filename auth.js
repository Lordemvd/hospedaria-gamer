// ==========================================
// GERENCIADOR DE AUTENTICAÇÃO E PERSISTÊNCIA
// ==========================================

const USERS_STORAGE_KEY = 'nexus_users';
const CURRENT_USER_KEY = 'nexus_current_user';

// 1. Obter todos os usuários salvos no LocalStorage
function getRegisteredUsers() {
  const users = localStorage.getItem(USERS_STORAGE_KEY);
  return users ? JSON.parse(users) : [];
}

// 2. Salvar novo usuário com validações de unicidade
function registerUser(userData) {
  const users = getRegisteredUsers();

  // Verifica se o e-mail já foi registrado
  const emailExists = users.some(u => u.email.toLowerCase() === userData.email.toLowerCase());
  if (emailExists) {
    return { success: false, message: 'Este e-mail já está em uso por outro jogador!' };
  }

  // Verifica se a GamerTag já foi registrada
  const tagExists = users.some(u => u.gamerTag.toLowerCase() === userData.gamerTag.toLowerCase());
  if (tagExists) {
    return { success: false, message: 'Esta GamerTag já foi resgatada por outro player!' };
  }

  // Cria objeto completo do usuário
  const newUser = {
    id: 'usr_' + Date.now(),
    fullName: userData.fullName,
    gamerTag: userData.gamerTag,
    email: userData.email,
    cpf: userData.cpf,
    password: userData.password,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

  return { success: true, user: newUser };
}

// 3. Fazer login validando credenciais
function loginUser(identifier, password) {
  const users = getRegisteredUsers();
  const cleanId = identifier.trim().toLowerCase();

  // Permite logar tanto com e-mail quanto com a GamerTag
  const foundUser = users.find(u => 
    (u.email.toLowerCase() === cleanId || u.gamerTag.toLowerCase() === cleanId) &&
    u.password === password
  );

  if (!foundUser) {
    return { success: false, message: 'E-mail/GamerTag ou senha incorretos!' };
  }

  // Salva a sessão ativa (sem a senha, por boas práticas)
  const sessionUser = {
    id: foundUser.id,
    fullName: foundUser.fullName,
    gamerTag: foundUser.gamerTag,
    email: foundUser.email
  };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));

  return { success: true, user: sessionUser };
}

// 4. Obter usuário logado atualmente
function getCurrentUser() {
  const current = localStorage.getItem(CURRENT_USER_KEY);
  return current ? JSON.parse(current) : null;
}

// 5. Encerrar sessão (Logout)
function logoutUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
  window.location.reload();
}