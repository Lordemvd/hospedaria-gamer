// ==========================================================================
// NEXUS INN — SUPABASE CORE ENGINE (POSTGRESQL & AUTH)
// ==========================================================================

// 1. CONFIGURAÇÃO E INSTANCIAÇÃO DINÂMICA
const SUPABASE_URL = 'https://jccjjyvryepfnrenqhbi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0zpUzcOfgIlHxhgDtShkpQ_G7xGOHxH';

let supabaseClient = null;

/**
 * Garante a inicialização e recuperação do cliente Supabase
 * protegendo a aplicação contra atrasos de carregamento da CDN externa.
 */
function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
  }
  return null;
}

// Inicialização imediata
getSupabaseClient();


// ==========================================================================
// 2. MOTOR DE RESERVAS & ANTI-OVERBOOKING
// ==========================================================================

/**
 * Grava uma nova reserva confirmada na tabela 'reservations'
 */
async function saveReservationToDB(reservationData) {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('⚠️ Supabase não detectado. Prosseguindo com armazenamento local.');
    return { success: false, fallback: true };
  }

  // Normalização de data para formato padrão ISO (YYYY-MM-DD) do PostgreSQL
  const parseValidDate = (dateStr) => {
    if (!dateStr || dateStr.includes('combinar')) {
      return new Date().toISOString().split('T')[0];
    }
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  try {
    const { data, error } = await client
      .from('reservations')
      .insert([
        {
          reservation_code: reservationData.codigo,
          guest_name: reservationData.hospede || 'Player Convidado',
          room_id: reservationData.quartoId || 'duo',
          room_name: reservationData.quarto,
          check_in: parseValidDate(reservationData.checkin),
          check_out: parseValidDate(reservationData.checkout),
          total_price: reservationData.total,
          payment_method: reservationData.metodo,
          status: 'CONFIRMADA'
        }
      ])
      .select();

    if (error) throw error;
    console.log('✅ Reserva gravada com sucesso no Supabase:', data);
    return { success: true, data };
  } catch (err) {
    console.error('❌ Erro ao salvar reserva no Supabase:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Consulta reservas ativas por GamerTag ou Código NX (usado no Hub e Perfil)
 */
async function fetchUserReservations(searchTerm) {
  const client = getSupabaseClient();
  if (!client) return { success: false, data: [] };

  try {
    const cleanTerm = searchTerm.trim();

    const { data, error } = await client
      .from('reservations')
      .select('*')
      .or(`guest_name.ilike.%${cleanTerm}%,reservation_code.ilike.%${cleanTerm}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err) {
    console.error('❌ Erro ao buscar reservas no Supabase:', err.message);
    return { success: false, error: err.message, data: [] };
  }
}

/**
 * Validação Anti-Overbooking: verifica colisão de datas no banco em tempo real
 */
async function checkRoomAvailability(roomId, checkinStr, checkoutStr) {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('⚠️ Supabase não conectado. Ignorando validação.');
    return { available: true };
  }

  try {
    const normalize = (d) => (d && d.includes('/')) ? d.split('/').reverse().join('-') : d;
    const checkin = normalize(checkinStr);
    const checkout = normalize(checkoutStr);

    let targetRoomId = roomId;
    if (['switch', 'ps5', 'xbox'].includes(roomId)) targetRoomId = 'duo';
    if (roomId === 'pc') targetRoomId = 'solo';

    const { data, error } = await client
      .from('reservations')
      .select('id, reservation_code, check_in, check_out, room_id')
      .eq('room_id', targetRoomId)
      .neq('status', 'CANCELADA')
      .lt('check_in', checkout)
      .gt('check_out', checkin);

    if (error) throw error;

    return {
      available: (!data || data.length === 0),
      conflicts: data || []
    };
  } catch (err) {
    console.error('❌ Erro na checagem Anti-Overbooking:', err.message);
    return { available: true, error: err.message };
  }
}


// ==========================================================================
// 3. FILA DE ESPERA & DROPS PRIORITÁRIOS
// ==========================================================================

/**
 * Registra contato na lista de espera para quartos esgotados
 */
async function saveWaitlistToDB(waitlistData) {
  const client = getSupabaseClient();
  if (!client) return { success: false };

  try {
    const { data, error } = await client
      .from('waitlist')
      .insert([
        {
          contact: waitlistData.contato,
          room_name: waitlistData.quarto,
          check_in: waitlistData.checkin,
          check_out: waitlistData.checkout
        }
      ]);

    if (error) throw error;
    console.log('✅ Drop alert registrado no Supabase.');
    return { success: true, data };
  } catch (err) {
    console.error('❌ Erro ao registrar na lista de espera:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Busca todas as inscrições na fila de espera (Painel Master)
 */
async function fetchAllWaitlist() {
  const client = getSupabaseClient();
  if (!client) return { success: false, data: [] };

  try {
    const { data, error } = await client
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err) {
    console.error('❌ Erro ao buscar fila de espera:', err.message);
    return { success: false, error: err.message, data: [] };
  }
}


// ==========================================================================
// 4. AUTENTICAÇÃO, CONTAS & RECUPERAÇÃO DE ACESSO
// ==========================================================================

/**
 * Cadastra novo usuário garantindo unicidade estrita de e-mail e GamerTag
 */
async function registerUserInDB(userData) {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase não conectado. Verifique o carregamento do SDK.' };
  }

  const cleanEmail = userData.email.trim().toLowerCase();
  const cleanTag = userData.gamerTag.trim();

  try {
    // 1. Verifica duplicidade de e-mail
    const { data: emailMatch, error: emailErr } = await client
      .from('users')
      .select('id')
      .ilike('email', cleanEmail)
      .limit(1);

    if (emailErr) throw emailErr;
    if (emailMatch && emailMatch.length > 0) {
      return { success: false, message: 'Este e-mail já está em uso por outro jogador!' };
    }

    // 2. Verifica duplicidade de GamerTag (case-insensitive)
    const { data: tagMatch, error: tagErr } = await client
      .from('users')
      .select('id')
      .ilike('gamer_tag', cleanTag)
      .limit(1);

    if (tagErr) throw tagErr;
    if (tagMatch && tagMatch.length > 0) {
      return { success: false, message: 'Esta GamerTag já foi resgatada por outro player!' };
    }

    // 3. Insere a conta
    const { data, error } = await client
      .from('users')
      .insert([
        {
          full_name: userData.fullName,
          gamer_tag: cleanTag,
          email: cleanEmail,
          password: userData.password,
          role: 'user',
          cpf: userData.cpf || null
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, user: data[0] };
  } catch (err) {
    console.error('❌ Erro no cadastro de usuário:', err.message);
    return { success: false, message: 'Falha ao salvar no banco: ' + err.message };
  }
}

/**
 * Autentica o jogador por E-mail ou GamerTag contra a senha
 */
async function loginUserInDB(identifier, password) {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase não conectado. Verifique o carregamento do SDK.' };
  }

  const cleanId = identifier.trim();

  try {
    let query = client
      .from('users')
      .select('id, full_name, gamer_tag, email, password, role, avatar, cpf, previous_tags');

    if (cleanId.includes('@')) {
      query = query.ilike('email', cleanId.toLowerCase());
    } else {
      query = query.ilike('gamer_tag', cleanId);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      if (error.code === '42P01') {
        return { success: false, message: 'A tabela "users" ainda não foi criada no SQL Editor do Supabase.' };
      }
      throw error;
    }

    if (!data || data.length === 0) {
      return { success: false, message: 'E-mail ou GamerTag não encontrados.' };
    }

    const user = data[0];

    if (user.password !== password) {
      return { success: false, message: 'Senha incorreta.' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        gamerTag: user.gamer_tag,
        email: user.email,
        role: user.role || 'user',
        avatar: user.avatar || null,
        cpf: user.cpf || null,
        previousTags: user.previous_tags || ''
      }
    };
  } catch (err) {
    console.error('❌ Erro na autenticação:', err.message);
    return { success: false, message: 'Falha ao autenticar no servidor: ' + err.message };
  }
}

/**
 * Atualiza campos de perfil (GamerTag, foto, previous_tags, nome)
 */
async function updateUserProfileInDB(userId, updateData) {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase não conectado.' };

  try {
    const { data, error } = await client
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select();

    if (error) throw error;
    return { success: true, user: data[0] };
  } catch (err) {
    console.error('❌ Erro ao atualizar perfil no banco:', err.message);
    return { success: false, message: err.message };
  }
}

/**
 * Localiza conta por E-mail ou CPF para recuperação de senha
 */
async function findUserForRecovery(identifier) {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase não conectado.' };

  const clean = identifier.trim().toLowerCase();
  const cleanNumeric = identifier.replace(/\D/g, '');

  try {
    let query = client.from('users').select('id, full_name, gamer_tag, email, cpf');

    if (clean.includes('@')) {
      query = query.ilike('email', clean);
    } else {
      query = query.or(`cpf.eq.${clean},cpf.eq.${cleanNumeric}`);
    }

    const { data, error } = await query.limit(1);
    if (error) throw error;

    if (!data || data.length === 0) {
      return { success: false, message: 'Nenhuma conta localizada com este e-mail ou CPF.' };
    }

    return { success: true, user: data[0] };
  } catch (err) {
    console.error('❌ Erro na busca de credenciais:', err.message);
    return { success: false, message: 'Erro na busca de credenciais: ' + err.message };
  }
}

/**
 * Grava uma nova senha na conta do usuário
 */
async function resetUserPasswordInDB(userId, newPassword) {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase não conectado.' };

  try {
    const { data, error } = await client
      .from('users')
      .update({ password: newPassword })
      .eq('id', userId)
      .select();

    if (error) throw error;
    return { success: true, user: data[0] };
  } catch (err) {
    console.error('❌ Erro ao gravar nova senha:', err.message);
    return { success: false, message: 'Erro ao gravar nova senha: ' + err.message };
  }
}


// ==========================================================================
// 5. FUNÇÕES ADMINISTRATIVAS (PAINEL MASTER ADM)
// ==========================================================================

/**
 * Lista todas as reservas do sistema para visualização administrativa
 */
async function fetchAllReservations() {
  const client = getSupabaseClient();
  if (!client) return { success: false, data: [] };

  try {
    const { data, error } = await client
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err) {
    console.error('❌ Erro ao listar todas as reservas:', err.message);
    return { success: false, error: err.message, data: [] };
  }
}

/**
 * Altera status da reserva (ex: 'CANCELADA', 'CHECKIN')
 */
async function updateReservationStatus(reservationCode, newStatus) {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase não conectado.' };

  try {
    const { data, error } = await client
      .from('reservations')
      .update({ status: newStatus })
      .eq('reservation_code', reservationCode.trim())
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('❌ Erro ao atualizar status da reserva:', err.message);
    return { success: false, message: err.message };
  }
}


// ==========================================================================
// 6. EXPORTAÇÃO GLOBAL UNIFICADA (WINDOW)
// ==========================================================================
if (typeof window !== 'undefined') {
  window.getSupabaseClient = getSupabaseClient;

  // Reservas & Anti-Overbooking
  window.saveReservationToDB = saveReservationToDB;
  window.fetchUserReservations = fetchUserReservations;
  window.checkRoomAvailability = checkRoomAvailability;

  // Fila de Espera
  window.saveWaitlistToDB = saveWaitlistToDB;
  window.fetchAllWaitlist = fetchAllWaitlist;

  // Autenticação & Usuários
  window.registerUserInDB = registerUserInDB;
  window.loginUserInDB = loginUserInDB;
  window.updateUserProfileInDB = updateUserProfileInDB;
  window.findUserForRecovery = findUserForRecovery;
  window.resetUserPasswordInDB = resetUserPasswordInDB;

  // Administrativo
  window.fetchAllReservations = fetchAllReservations;
  window.updateReservationStatus = updateReservationStatus;
}