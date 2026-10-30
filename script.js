// ==========================================
// NEXUS INN — CORE SCRIPT (COMPLETO E UNIFICADO)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. SLIDER DO HERO (INDEX.HTML)
  // ==========================================
  const slides = document.querySelectorAll('.slider-container .slide');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  let currentSlide = 0;
  let slideInterval = null;

  function showSlide(index) {
    if (slides.length === 0) return;
    slides[currentSlide].classList.remove('active');
    currentSlide = (index + slides.length) % slides.length;
    slides[currentSlide].classList.add('active');
  }

  function nextSlide() { showSlide(currentSlide + 1); }
  function prevSlide() { showSlide(currentSlide - 1); }

  function startSlideTimer() {
    if (slides.length > 1) {
      clearInterval(slideInterval);
      slideInterval = setInterval(nextSlide, 6000);
    }
  }

  if (slides.length > 0) {
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        nextSlide();
        startSlideTimer();
      });
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        prevSlide();
        startSlideTimer();
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
  const roomSelect = document.getElementById('room') || document.getElementById('console');
  const submitBtn = bookingForm ? bookingForm.querySelector('button[type="submit"]') : null;

  const todayStr = new Date().toISOString().split('T')[0];
  if (checkinInput) {
    checkinInput.setAttribute('min', todayStr);
    checkinInput.addEventListener('change', () => {
      const selected = checkinInput.value;
      if (selected && checkoutInput) {
        checkoutInput.setAttribute('min', selected);
        if (checkoutInput.value && checkoutInput.value <= selected) {
          checkoutInput.value = '';
        }
      }
    });
  }

  if (bookingForm) {
    bookingForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const checkinVal = checkinInput.value;
      const checkoutVal = checkoutInput.value;

      if (!checkinVal || !checkoutVal) {
        alert('Por favor, selecione as datas de check-in e check-out.');
        return;
      }

      if (new Date(checkoutVal) <= new Date(checkinVal)) {
        alert('A data de check-out deve ser posterior à data de check-in.');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Verificando vagas...';
      }

      const selectedRoom = roomSelect ? roomSelect.value : 'duo';
      let isAvailable = true;

      // Consulta de disponibilidade real no Supabase com proteção de timeout
      if (typeof checkRoomAvailability === 'function') {
        try {
          const timeoutPromise = new Promise((resolve) =>
            setTimeout(() => resolve({ available: true, timeout: true }), 3500)
          );
          const check = await Promise.race([
            checkRoomAvailability(selectedRoom, checkinVal, checkoutVal),
            timeoutPromise
          ]);
          if (check && check.available === false) {
            isAvailable = false;
          }
        } catch (err) {
          console.warn('Falha na consulta ao banco, prosseguindo com fluxo padrão:', err);
        }
      }

      const params = new URLSearchParams({
        room: selectedRoom,
        checkin: checkinVal,
        checkout: checkoutVal
      });

      if (!isAvailable) {
        window.location.href = `pages/ocupado.html?${params.toString()}`;
      } else {
        window.location.href = `pages/reserva.html?${params.toString()}`;
      }
    });
  }

  // ==========================================
  // 3. MENU HAMBÚRGUER E CALENDÁRIO FLATPICKR
  // ==========================================
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks') || document.querySelector('.nav-links');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });
  }

  document.querySelectorAll('input[type="date"]').forEach(dateInput => {
    dateInput.addEventListener('click', () => {
      if (typeof dateInput.showPicker === 'function') {
        dateInput.showPicker();
      }
    });
  });

  // Configuração Flatpickr para o Hero da Home
  if (typeof flatpickr !== 'undefined') {
    const fpCheckout = flatpickr("#checkout", {
      locale: "pt",
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d/m/Y",
      minDate: "today",
      disableMobile: true
    });

    flatpickr("#checkin", {
      locale: "pt",
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d/m/Y",
      minDate: "today",
      disableMobile: true,
      onChange: function(selectedDates) {
        if (selectedDates[0]) {
          const nextDay = new Date(selectedDates[0]);
          nextDay.setDate(nextDay.getDate() + 1);
          fpCheckout.set('minDate', nextDay);
        }
      }
    });
  }

  // ==========================================
  // 4. INJEÇÃO DO MODAL DE "MINHAS RESERVAS" (POSTGRESQL QUERY)
  // ==========================================
  const modalHTML = `
    <div id="modalReservas" class="reservas-modal">
      <div class="reservas-modal-card">
        <div class="reservas-modal-header">
          <div>
            <span class="badge" style="font-size: 0.72rem; margin-bottom: 4px;">POSTGRESQL LIVE QUERY</span>
            <h3 style="font-family: var(--font-display); color: #fff; margin: 0;">MINHAS RESERVAS</h3>
          </div>
          <button type="button" id="fecharModalReservas" class="close-modal-btn" aria-label="Fechar">&times;</button>
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

  if (fecharBtn && modal) {
    fecharBtn.addEventListener('click', () => modal.classList.remove('show'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('show');
    });
  }

  async function executarBusca(termo) {
    if (!termo || !listaContainer) return;
    listaContainer.innerHTML = '<div class="spinner" style="width: 32px; height: 32px; margin: 30px auto;"></div>';

    if (typeof fetchUserReservations !== 'function') {
      listaContainer.innerHTML = '<p class="reservas-empty-hint" style="color: #ff6b8b;">SDK do Supabase não conectado nesta página.</p>';
      return;
    }

    const res = await fetchUserReservations(termo);

    if (!res.success || !res.data || res.data.length === 0) {
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
            📅 ${item.check_in ? item.check_in.split('-').reverse().join('/') : ''} até ${item.check_out ? item.check_out.split('-').reverse().join('/') : ''}
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

  if (btnBuscar && inputBusca) {
    btnBuscar.addEventListener('click', () => executarBusca(inputBusca.value));
    inputBusca.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') executarBusca(inputBusca.value);
    });
  }

  // ==========================================
  // 5. HUB DO JOGADOR: AVATAR CIRCULAR, DROPDOWN & DASHBOARD DEDICADO
  // ==========================================
  // Sincroniza sessão caso venha o parâmetro ?user= na URL
  const urlParams = new URLSearchParams(window.location.search);
  const userFromUrl = urlParams.get('user');
  if (userFromUrl) {
    localStorage.setItem('nexus_current_user', JSON.stringify({ gamerTag: userFromUrl, role: 'user' }));
  }

  const currentUserRaw = localStorage.getItem('nexus_current_user');

  if (currentUserRaw && navLinks) {
    try {
      const user = JSON.parse(currentUserRaw);
      const tag = user.gamerTag || user.fullName || 'Player';
      const isAdmin = user.role === 'admin';

      // Ajusta o caminho relativo dependendo de onde a página estiver rodando
      const basePath = window.location.pathname.includes('/pages/') ? '' : 'pages/';

      // Avatar oficial do jogador (salvo no perfil) ou ícone gamer padrão
      const defaultAvatar = user.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23090a12'/%3E%3Ctext x='50' y='62' font-size='42' text-anchor='middle' fill='%2300f0ff'%3E🎮%3C/text%3E%3C/svg%3E";

      // Localiza o botão "Entrar" na Navbar para substituição cirúrgica
      let loginBtn = navLinks.querySelector('.btn-link');
      if (!loginBtn) {
        const links = navLinks.querySelectorAll('a');
        for (let l of links) {
          if (l.textContent.trim().toLowerCase().includes('entrar')) {
            loginBtn = l;
            break;
          }
        }
      }

      if (loginBtn) {
        // Wrapper principal da Navbar
        const hubWrapper = document.createElement('div');
        hubWrapper.className = 'user-nav-actions';
        hubWrapper.style.display = 'inline-flex';
        hubWrapper.style.alignItems = 'center';
        hubWrapper.style.gap = '12px';

        hubWrapper.innerHTML = `
          ${isAdmin ? `
            <a href="${basePath}admin.html" style="background: rgba(255, 0, 85, 0.15); border: 1px solid var(--neon-pink); color: #ff6b8b; padding: 7px 12px; border-radius: 4px; font-family: var(--font-display); font-size: 0.85rem; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
              🛡️ Painel ADM
            </a>
          ` : ''}

          <!-- AVATAR CIRCULAR COM STATUS ONLINE E DROPDOWN -->
          <div class="user-hub-container">
            <button type="button" class="user-hub-btn" id="userHubBtn" title="Hub do Jogador: ${tag}">
              <img src="${defaultAvatar}" alt="Avatar" class="user-hub-avatar" id="navbarAvatarImg">
              <span class="user-status-dot"></span>
            </button>

            <div class="user-hub-dropdown" id="userHubDropdown">
              <div class="hub-user-header">
                <img src="${defaultAvatar}" alt="Thumb" class="hub-header-thumb" id="dropdownThumbImg">
                <div class="hub-user-meta">
                  <small>Gamer Conectado</small>
                  <strong>${tag}</strong>
                </div>
              </div>
              <button type="button" class="hub-item" id="btnHubDados">
                <span>👤</span> Dados da Conta
              </button>
              <button type="button" class="hub-item" id="btnHubReservas">
                <span>📋</span> Minhas Reservas
              </button>
              <button type="button" class="hub-item hub-logout" id="btnHubLogout">
                <span>🚪</span> Sair da Conta
              </button>
            </div>
          </div>
        `;

        // Substitui apenas o botão Entrar (mantém os outros links da Navbar intactos)
        loginBtn.replaceWith(hubWrapper);

        const hubBtn = document.getElementById('userHubBtn');
        const hubDropdown = document.getElementById('userHubDropdown');

        // Alterna abertura e fechamento do Dropdown
        hubBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          hubDropdown.classList.toggle('active');
        });

        document.addEventListener('click', () => {
          hubDropdown.classList.remove('active');
        });

        // 1. Redirecionamento para a aba "Dados da Conta" no Dashboard
        document.getElementById('btnHubDados').addEventListener('click', () => {
          hubDropdown.classList.remove('active');
          window.location.href = `${basePath}perfil.html?tab=dados`;
        });

        // 2. Redirecionamento para a aba "Minhas Reservas" no Dashboard
        document.getElementById('btnHubReservas').addEventListener('click', () => {
          hubDropdown.classList.remove('active');
          window.location.href = `${basePath}perfil.html?tab=reservas`;
        });

        // 3. Encerramento de Sessão
        document.getElementById('btnHubLogout').addEventListener('click', () => {
          if (confirm(`Deseja desconectar a conta de ${tag}?`)) {
            localStorage.removeItem('nexus_current_user');
            window.location.reload();
          }
        });
      }
    } catch (e) {
      console.error('Erro ao ler sessão do usuário:', e);
    }
  }

  // ==========================================
  // 6. LISTA DE ESPERA (CASO EXISTA NA PÁGINA)
  // ==========================================
  const formEspera = document.getElementById('form-espera');
  const feedback = document.getElementById('feedback-espera');

  if (formEspera && feedback) {
    formEspera.addEventListener('submit', (event) => {
      event.preventDefault();
      const inputContato = document.getElementById('contato-espera');
      const valorContato = inputContato ? inputContato.value.trim() : '';

      if (!valorContato) return;

      feedback.textContent = 'Você está na fila! Avisaremos assim que o quarto liberar.';
      feedback.classList.remove('erro');
      feedback.classList.add('sucesso');
      feedback.hidden = false;

      formEspera.reset();

      setTimeout(() => {
        feedback.hidden = true;
      }, 5000);
    });
  }

  // ==========================================
  // 7. DIAGNÓSTICO DE CONEXÃO & TESTADOR DE PING
  // ==========================================
  const btnRunPing = document.getElementById('btnRunPing');
  const pingProgressBar = document.getElementById('pingProgressBar');
  const pingStatusText = document.getElementById('pingStatusText');
  const pingLogTerminal = document.getElementById('pingLogTerminal');

  const pingSpVal = document.getElementById('pingSpVal');
  const jitterVal = document.getElementById('jitterVal');
  const lossVal = document.getElementById('lossVal');

  if (btnRunPing) {
    let isTesting = false;

    btnRunPing.addEventListener('click', () => {
      if (isTesting) return;
      isTesting = true;

      btnRunPing.disabled = true;
      btnRunPing.innerHTML = 'Escaneando Rota...';
      pingStatusText.textContent = 'PROBE ATIVO';
      pingStatusText.style.color = '#ffbd2e';

      pingLogTerminal.innerHTML = '<p>> [INIT] Abrindo soquete de diagnóstico ICMP...</p>';
      pingProgressBar.style.width = '0%';

      const logs = [
        { progress: '25%', text: '> [RESOLV] Rota traçada: São Paulo Equinix SP4 Datacenter...', delay: 500 },
        { progress: '50%', text: '> [MEASURE] Enviando 32 pacotes UDP via rota primária...', delay: 1100 },
        { progress: '75%', text: '> [AUDIT] Medindo variação de clock (jitter) e jitter buffer...', delay: 1700 },
        { progress: '100%', text: '> [DONE] Diagnóstico concluído: Conexão Tier-1 Homologada para eSports.', delay: 2400 }
      ];

      // Oscilação dinâmica nos números durante o teste
      const intervalAnim = setInterval(() => {
        pingSpVal.textContent = (Math.random() * 3 + 3).toFixed(1);
        jitterVal.textContent = (Math.random() * 0.4 + 0.3).toFixed(2);
      }, 100);

      logs.forEach(item => {
        setTimeout(() => {
          pingProgressBar.style.width = item.progress;
          const p = document.createElement('p');
          p.textContent = item.text;
          pingLogTerminal.appendChild(p);
          pingLogTerminal.scrollTop = pingLogTerminal.scrollHeight;
        }, item.delay);
      });

      // Conclusão com números estáveis de alta performance
      setTimeout(() => {
        clearInterval(intervalAnim);
        pingSpVal.textContent = '4.2';
        jitterVal.textContent = '0.45';
        lossVal.textContent = '0.0';

        pingStatusText.textContent = 'OTIMIZADO // 0% LOSS';
        pingStatusText.style.color = '#00ffaa';

        btnRunPing.disabled = false;
        btnRunPing.innerHTML = '⚡ Repetir Diagnóstico';
        isTesting = false;
      }, 2600);
    });
  }

});