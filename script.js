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
  // 2. BUSCA RÁPIDA COM VALIDAÇÃO REAL SUPABASE
  // ==========================================
  const bookingForm = document.querySelector('.booking-form');
  const checkinInput = document.getElementById('checkin');
  const checkoutInput = document.getElementById('checkout');
  const consoleSelect = document.getElementById('console');
  const submitBtn = bookingForm ? bookingForm.querySelector('button[type="submit"]') : null;

  if (bookingForm) {
    bookingForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const checkinVal = checkinInput.value;
      const checkoutVal = checkoutInput.value;

      if (!checkinVal || !checkoutVal) {
        alert('Por favor, selecione as datas de entrada e saída.');
        return;
      }

      const checkinDate = new Date(checkinVal);
      const checkoutDate = new Date(checkoutVal);

      if (checkoutDate <= checkinDate) {
        alert('A data de check-out deve ser posterior à data de check-in.');
        return;
      }

      // Feedback visual no botão
      const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Buscar';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Verificando...';
      }

      const selectedConsole = consoleSelect ? consoleSelect.value : 'all';
      
      // Mapeia o quarto alvo para a consulta
      let roomId = 'duo';
      if (selectedConsole === 'pc') roomId = 'solo';
      if (selectedConsole === 'switch') roomId = 'squad';

      // Consulta a disponibilidade real no PostgreSQL
      let isAvailable = true;
      if (typeof checkRoomAvailability === 'function') {
        const check = await checkRoomAvailability(roomId, checkinVal, checkoutVal);
        isAvailable = check.available;
      }

      const params = new URLSearchParams({
        room: roomId,
        checkin: checkinVal,
        checkout: checkoutVal,
        console: selectedConsole
      });

      if (!isAvailable) {
        // Redireciona para ocupado caso o quarto já esteja reservado nessas datas
        window.location.href = `pages/ocupado.html?${params.toString()}`;
      } else {
        // Libera a tela de reserva com as datas validadas
        window.location.href = `pages/reserva.html?${params.toString()}`;
      }
    });
  }

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

  // Força a abertura do calendário ao clicar em qualquer ponto da caixa de data
  document.querySelectorAll('input[type="date"]').forEach(dateInput => {
    dateInput.addEventListener('click', () => {
      if (typeof dateInput.showPicker === 'function') {
        dateInput.showPicker();
      }
    });
  });

  // Inicialização do Calendário Gamer Temático
  if (typeof flatpickr !== 'undefined') {
    flatpickr("input[type='date']", {
      locale: "pt",
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d/m/Y",
      minDate: "today",
      disableMobile: true // Garante o visual gamer mesmo em smartphones
    });
  }

  const formEspera = document.getElementById('form-espera');
const feedback = document.getElementById('feedback-espera');

formEspera.addEventListener('submit', async (event) => {
  event.preventDefault();

  const inputContato = document.getElementById('contato-espera');
  const valorContato = inputContato.value.trim();

  if (!valorContato) return;

  // Simulação de persistência local / envio
  console.log('Registo na lista de espera:', valorContato);

  // Feedback visual ao utilizador
  feedback.textContent = 'Você está na fila! Avisaremos assim que o quarto liberar.';
  feedback.classList.remove('erro');
  feedback.classList.add('sucesso');
  feedback.hidden = false;

  // Limpa o formulário
  formEspera.reset();

  // Oculta a mensagem após 5 segundos
  setTimeout(() => {
    feedback.hidden = true;
  }, 5000);
});

// ==========================================
// RENDERIZAÇÃO DA SESSÃO GAMER NA NAVBAR
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const currentUserRaw = localStorage.getItem('nexus_current_user');
  const loginLink = document.querySelector('.nav-links a[href*="login.html"]');

  if (currentUserRaw && loginLink) {
    try {
      const user = JSON.parse(currentUserRaw);
      const gamerTag = user.gamerTag || user.fullName || 'Player';

      // Substitui o link de login por um badge interativo do jogador
      const profileContainer = document.createElement('div');
      profileContainer.style.display = 'inline-flex';
      profileContainer.style.alignItems = 'center';
      profileContainer.style.gap = '8px';

      profileContainer.innerHTML = `
        <span style="color: var(--neon-cyan); font-family: var(--font-display); font-size: 0.9rem; background: rgba(0,240,255,0.08); padding: 6px 12px; border-radius: 4px; border: 1px solid var(--border-glow);">
          🎮 ${gamerTag}
        </span>
        <button id="btnLogout" type="button" style="background: transparent; border: 1px solid rgba(255,0,85,0.4); color: #ff6b8b; padding: 6px 10px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; font-family: var(--font-display);">
          Sair
        </button>
      `;

      loginLink.replaceWith(profileContainer);

      document.getElementById('btnLogout').addEventListener('click', () => {
        if (confirm(`Deseja desconectar a conta de ${gamerTag}?`)) {
          localStorage.removeItem('nexus_current_user');
          window.location.reload();
        }
      });
    } catch (e) {}
  }
});

// ==========================================
// MODAL & CONSULTA DE RESERVAS NO SUPABASE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // 1. Injeta o HTML do Modal de Reservas no body
  const modalHTML = `
    <div id="modalReservas" class="reservas-modal">
      <div class="reservas-modal-card">
        <div class="reservas-modal-header">
          <div>
            <span class="badge" style="font-size: 0.72rem; margin-bottom: 4px;">BASE DE DADOS POSTGRESQL</span>
            <h3 style="font-family: var(--font-display); color: #fff; margin: 0;">MINHAS RESERVAS</h3>
          </div>
          <button type="button" id="fecharModalReservas" class="close-modal-btn">&times;</button>
        </div>

        <div class="reservas-search-bar">
          <input type="text" id="inputBuscaReserva" placeholder="Digite sua GamerTag ou Código (ex: NX-123456)">
          <button type="button" id="btnBuscarReserva" class="btn-primary" style="padding: 10px 18px;">Buscar</button>
        </div>

        <div id="listaReservasContainer" class="reservas-lista">
          <p class="reservas-empty-hint">Digite sua GamerTag ou código NX para buscar registros no banco de dados.</p>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.getElementById('modalReservas');
  const fecharBtn = document.getElementById('fecharModalReservas');
  const inputBusca = document.getElementById('inputBuscaReserva');
  const btnBuscar = document.getElementById('btnBuscarReserva');
  const listaContainer = document.getElementById('listaReservasContainer');

  fecharBtn.addEventListener('click', () => modal.classList.remove('show'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('show');
  });

  // Função para executar a busca e renderizar os cards
  async function executarBusca(termo) {
    if (!termo) return;
    listaContainer.innerHTML = '<div class="spinner" style="width: 32px; height: 32px; margin: 30px auto;"></div>';

    if (typeof fetchUserReservations !== 'function') {
      listaContainer.innerHTML = '<p class="reservas-empty-hint" style="color: #ff6b8b;">SDK do Supabase não carregado nesta página.</p>';
      return;
    }

    const res = await fetchUserReservations(termo);

    if (!res.success || res.data.length === 0) {
      listaContainer.innerHTML = `
        <div style="text-align: center; padding: 25px 0;">
          <p style="color: var(--text-muted); font-size: 0.95rem;">Nenhuma reserva encontrada para "<strong>${termo}</strong>".</p>
        </div>
      `;
      return;
    }

    listaContainer.innerHTML = res.data.map(item => `
      <div class="reserva-item-card">
        <div class="reserva-item-header">
          <span class="reserva-code">${item.reservation_code}</span>
          <span class="reserva-status-badge">${item.status}</span>
        </div>
        <div class="reserva-item-body">
          <strong style="color: #fff; font-size: 1.05rem;">${item.room_name}</strong>
          <span style="color: var(--text-muted); font-size: 0.88rem;">Hóspede: <strong>${item.guest_name}</strong></span>
          <span style="color: var(--neon-cyan); font-size: 0.88rem;">
            📅 ${item.check_in.split('-').reverse().join('/')} até ${item.check_out.split('-').reverse().join('/')}
          </span>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px;">
            <span style="font-family: var(--font-display); color: #fff;">${item.total_price} <small style="color: var(--text-muted);">(${item.payment_method})</small></span>
            <a href="pages/finalizacao.html?codigo=${item.reservation_code}&hospede=${encodeURIComponent(item.guest_name)}&quarto=${encodeURIComponent(item.room_name)}&checkin=${item.check_in}&checkout=${item.check_out}&total=${encodeURIComponent(item.total_price)}&metodo=${encodeURIComponent(item.payment_method)}" class="btn-secondary" style="padding: 6px 12px; font-size: 0.78rem;">
              Ver Gamer Pass
            </a>
          </div>
        </div>
      </div>
    `).join('');
  }

  btnBuscar.addEventListener('click', () => executarBusca(inputBusca.value));
  inputBusca.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executarBusca(inputBusca.value);
  });

  // 2. Integração da Navbar com Sessão e Botão "Minhas Reservas"
  const currentUserRaw = localStorage.getItem('nexus_current_user');
  const loginLink = document.querySelector('.nav-links a[href*="login.html"]');

  if (currentUserRaw && loginLink) {
    try {
      const user = JSON.parse(currentUserRaw);
      const tag = user.gamerTag || user.fullName || 'Player';

      const navActions = document.createElement('div');
      navActions.style.display = 'inline-flex';
      navActions.style.alignItems = 'center';
      navActions.style.gap = '8px';

      navActions.innerHTML = `
        <button type="button" id="btnMinhasReservas" style="background: rgba(0,240,255,0.08); border: 1px solid var(--border-glow); color: var(--neon-cyan); padding: 7px 12px; border-radius: 4px; font-family: var(--font-display); font-size: 0.85rem; cursor: pointer;">
          🎮 ${tag} &bull; Reservas
        </button>
        <button id="btnLogout" type="button" style="background: transparent; border: 1px solid rgba(255,0,85,0.4); color: #ff6b8b; padding: 7px 10px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; font-family: var(--font-display);">
          Sair
        </button>
      `;

      loginLink.replaceWith(navActions);

      document.getElementById('btnMinhasReservas').addEventListener('click', () => {
        modal.classList.add('show');
        inputBusca.value = tag;
        executarBusca(tag);
      });

      document.getElementById('btnLogout').addEventListener('click', () => {
        if (confirm(`Deseja desconectar a conta de ${tag}?`)) {
          localStorage.removeItem('nexus_current_user');
          window.location.reload();
        }
      });
    } catch (e) {}
  }
});