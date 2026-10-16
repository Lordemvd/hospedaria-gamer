document.addEventListener('DOMContentLoaded', () => {
  // 1. Tenta pegar da URL ou do LocalStorage
  const urlParams = new URLSearchParams(window.location.search);
  const userFromUrl = urlParams.get('user');
  let currentUserRaw = localStorage.getItem('nexus_current_user');

  let gamerTag = null;

  if (userFromUrl) {
    gamerTag = userFromUrl;
    // Salva também no localstorage da página index
    localStorage.setItem('nexus_current_user', JSON.stringify({ gamerTag: userFromUrl }));
  } else if (currentUserRaw) {
    try {
      const parsed = JSON.parse(currentUserRaw);
      gamerTag = parsed.gamerTag;
    } catch(e) {}
  }

  // 2. Se achou um usuário, troca "Entrar" pelo menu
  if (gamerTag) {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    // Acha o link de entrar
    let loginBtn = null;
    const links = navLinks.querySelectorAll('a');
    for (let link of links) {
      if (link.textContent.trim().toLowerCase().includes('entrar')) {
        loginBtn = link;
        break;
      }
    }

    if (loginBtn) {
      const userMenu = document.createElement('div');
      userMenu.className = 'user-dropdown-container';
      userMenu.innerHTML = `
        <button type="button" class="user-menu-btn" id="userMenuBtn">
          <span class="user-avatar-badge">🎮</span>
          <span class="user-tag-text">${gamerTag}</span>
          <span class="arrow-indicator">&#9662;</span>
        </button>
        <div class="user-dropdown-menu" id="userDropdownMenu">
          <div class="dropdown-header">
            <small>Conectado como</small>
            <strong>${gamerTag}</strong>
          </div>
          <hr class="dropdown-divider">
          <a href="#" class="dropdown-item" onclick="alert('Perfil: ${gamerTag}'); return false;">
            <span>👤</span> Meu Perfil
          </a>
          <a href="#" class="dropdown-item" onclick="alert('Sem reservas no momento.'); return false;">
            <span>📋</span> Minhas Reservas
          </a>
          <hr class="dropdown-divider">
          <a href="#" class="dropdown-item logout-item" id="logoutAction">
            <span>🚪</span> Sair da Conta
          </a>
        </div>
      `;

      loginBtn.replaceWith(userMenu);

      const menuBtn = document.getElementById('userMenuBtn');
      const dropdown = document.getElementById('userDropdownMenu');

      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
      });

      document.addEventListener('click', () => {
        dropdown.classList.remove('active');
      });

      document.getElementById('logoutAction').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('nexus_current_user');
        window.location.href = 'index.html';
      });
    }
  }
});
  // ==========================================
  // 1. LÓGICA DO SLIDER HERO
  // ==========================================
  const slides = document.querySelectorAll('.slider-container .slide');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  let currentSlide = 0;
  let slideInterval;

  function showSlide(index) {
    // Remove a classe 'active' do slide atual
    slides[currentSlide].classList.remove('active');

    // Calcula o próximo índice com efeito circular (vai do último para o primeiro e vice-versa)
    currentSlide = (index + slides.length) % slides.length;

    // Adiciona a classe 'active' ao novo slide
    slides[currentSlide].classList.add('active');
  }

  function nextSlide() {
    showSlide(currentSlide + 1);
  }

  function prevSlide() {
    showSlide(currentSlide - 1);
  }

  // Rotação automática a cada 6 segundos
  function startSlideTimer() {
    slideInterval = setInterval(nextSlide, 6000);
  }

  function resetSlideTimer() {
    clearInterval(slideInterval);
    startSlideTimer();
  }

  if (slides.length > 0) {
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        nextSlide();
        resetSlideTimer();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        prevSlide();
        resetSlideTimer();
      });
    }

    startSlideTimer();
  }

  // ==========================================
  // 2. LÓGICA DA BUSCA RÁPIDA DE RESERVA
  // ==========================================
  const bookingForm = document.querySelector('.booking-form');
  const checkinInput = document.getElementById('checkin');
  const checkoutInput = document.getElementById('checkout');
  const consoleSelect = document.getElementById('console');

  // Define a data mínima de check-in como hoje
  const today = new Date().toISOString().split('T')[0];
  if (checkinInput) {
    checkinInput.setAttribute('min', today);

    // Ajusta o check-out mínimo dinamicamente ao escolher o check-in
    checkinInput.addEventListener('change', () => {
      const selectedCheckin = checkinInput.value;
      if (selectedCheckin) {
        checkoutInput.setAttribute('min', selectedCheckin);

        // Se a data de check-out atual for menor que o novo check-in, reseta o check-out
        if (checkoutInput.value && checkoutInput.value <= selectedCheckin) {
          checkoutInput.value = '';
        }
      }
    });
  }

  if (bookingForm) {
    bookingForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const checkinDate = new Date(checkinInput.value);
      const checkoutDate = new Date(checkoutInput.value);

      // Validação de intervalo de datas
      if (checkoutDate <= checkinDate) {
        alert('A data de check-out deve ser posterior à data de check-in.');
        return;
      }

      // Parâmetros para enviar à próxima etapa
      const selectedConsole = consoleSelect ? consoleSelect.value : 'all';
      const params = new URLSearchParams({
        checkin: checkinInput.value,
        checkout: checkoutInput.value,
        console: selectedConsole
      });

      /*
        LÓGICA DE SIMULAÇÃO DIDÁTICA:
        Para testar o fluxo de "Quarto Ocupado" no trabalho, você pode
        simular que uma data ou opção específica cai na tela de ocupado.
        Exemplo: se escolher 'switch', simula ocupação.
      */
      const simularOcupado = selectedConsole === 'switch';

      if (simularOcupado) {
        window.location.href = `pages/ocupado.html?${params.toString()}`;
      } else {
        window.location.href = `pages/reserva.html?${params.toString()}`;
      }
    });
  }
  // Exibe o nome do usuário logado na Navbar do Index
const currentUser = localStorage.getItem('nexus_current_user');
if (currentUser) {
  const user = JSON.parse(currentUser);
  const navLinks = document.querySelector('.nav-links');
  const loginBtn = document.querySelector('.nav-links .btn-link');

  if (loginBtn) {
    loginBtn.innerHTML = `🎮 ${user.gamerTag}`;
    loginBtn.href = '#';
    loginBtn.onclick = (e) => {
      e.preventDefault();
      if (confirm(`Deseja desconectar a conta de ${user.gamerTag}?`)) {
        localStorage.removeItem('nexus_current_user');
        window.location.reload();
      }
    };
  }
}
});

// ==========================================
// 3. GERENCIAMENTO VISUAL DA SESSÃO DO USUÁRIO (ROBUSTO)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const currentUserRaw = localStorage.getItem('nexus_current_user');
  
  if (!currentUserRaw) return; // Ninguém logado, mantém normal

  const user = JSON.parse(currentUserRaw);
  const navLinks = document.querySelector('.nav-links');

  if (!navLinks) return;

  // Procura o botão de login de várias formas (por classe ou pelo texto "Entrar")
  let loginBtn = navLinks.querySelector('.btn-link');
  if (!loginBtn) {
    const allLinks = navLinks.querySelectorAll('a');
    for (let link of allLinks) {
      if (link.textContent.trim().toLowerCase().includes('entrar')) {
        loginBtn = link;
        break;
      }
    }
  }

  // Se encontrou o botão de entrar, substitui pelo menu do usuário
  if (loginBtn) {
    const userMenuContainer = document.createElement('div');
    userMenuContainer.className = 'user-dropdown-container';

    userMenuContainer.innerHTML = `
      <button type="button" class="user-menu-btn" id="userMenuBtn">
        <span class="user-avatar-badge">🎮</span>
        <span class="user-tag-text">${user.gamerTag || 'Player'}</span>
        <span class="arrow-indicator">&#9662;</span>
      </button>

      <div class="user-dropdown-menu" id="userDropdownMenu">
        <div class="dropdown-header">
          <small>Conectado como</small>
          <strong>${user.fullName || user.gamerTag}</strong>
        </div>
        <hr class="dropdown-divider">
        <a href="#" class="dropdown-item" id="btnPerfil">
          <span>👤</span> Meu Perfil
        </a>
        <a href="#" class="dropdown-item" id="btnReservas">
          <span>📋</span> Minhas Reservas
        </a>
        <hr class="dropdown-divider">
        <a href="#" class="dropdown-item logout-item" id="logoutAction">
          <span>🚪</span> Sair da Conta
        </a>
      </div>
    `;

    loginBtn.replaceWith(userMenuContainer);

    // Eventos do menu
    const menuBtn = document.getElementById('userMenuBtn');
    const dropdownMenu = document.getElementById('userDropdownMenu');

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('active');
    });

    document.addEventListener('click', () => {
      dropdownMenu.classList.remove('active');
    });

    document.getElementById('btnPerfil').addEventListener('click', (e) => {
      e.preventDefault();
      alert(`=== PERFIL DO JOGADOR ===\nGamerTag: ${user.gamerTag}\nNome: ${user.fullName}\nE-mail: ${user.email}`);
    });

    document.getElementById('btnReservas').addEventListener('click', (e) => {
      e.preventDefault();
      alert('Você ainda não possui reservas concluídas.');
    });

    document.getElementById('logoutAction').addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm(`Deseja encerrar a sessão de ${user.gamerTag}?`)) {
        localStorage.removeItem('nexus_current_user');
        window.location.reload();
      }
    });
  }
});

// ==========================================
  // CONTROLE DO MENU HAMBÚRGUER (MOBILE & TABLET)
  // ==========================================
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  if (menuToggle && navLinks) {
    // Alterna a abertura do menu ao clicar nos 3 traços
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navLinks.classList.toggle('open');
    });

    // Fecha o menu ao clicar em qualquer link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });
  }