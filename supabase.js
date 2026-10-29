// ==========================================
// CONFIGURAÇÃO DO SUPABASE (NEXUS INN)
// ==========================================

const SUPABASE_URL = 'https://jccjjyvryepfnrenqhbi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0zpUzcOfgIlHxhgDtShkpQ_G7xGOHxH';

let supabaseClient = null;

// Garante que o cliente seja criado mesmo se a CDN carregar com atraso
function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
  }
  return null;
}

getSupabaseClient();
// ==========================================
// FUNÇÕES DE PERSISTÊNCIA EM BANCO DE DADOS
// ==========================================

// 1. Gravar Reserva no PostgreSQL
async function saveReservationToDB(reservationData) {
  if (!supabaseClient) {
    console.warn('Supabase não detectado. Prosseguindo com armazenamento local.');
    return { success: false, fallback: true };
  }

  // Tratamento de data para conformidade com a coluna DATE do PostgreSQL
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
    const { data, error } = await supabaseClient
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

// 2. Gravar Registro na Fila de Espera (Drop Alerts)
async function saveWaitlistToDB(waitlistData) {
  if (!supabaseClient) return { success: false };

  try {
    const { data, error } = await supabaseClient
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
    console.log('✅ Notificação registrada no Supabase.');
    return { success: true, data };
  } catch (err) {
    console.error('❌ Erro ao registrar na lista de espera:', err.message);
    return { success: false, error: err.message };
  }
}

// 3. Consultar Reservas por GamerTag ou Código de Reserva
async function fetchUserReservations(searchTerm) {
  const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : supabaseClient;
  
  if (!client) {
    return { success: false, data: [] };
  }

  try {
    const cleanTerm = searchTerm.trim();

    // Busca tanto pelo código NX quanto pela GamerTag (guest_name)
    const { data, error } = await client
      .from('reservations')
      .select('*')
      .or(`guest_name.ilike.%${cleanTerm}%,reservation_code.ilike.%${cleanTerm}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data || []
    };
  } catch (err) {
    console.error('Erro ao buscar reservas no Supabase:', err.message);
    return { success: false, error: err.message, data: [] };
  }
}

// Garante visibilidade no escopo global
window.fetchUserReservations = fetchUserReservations;

// 4. Verificar Disponibilidade Real de Quarto (Anti-Overbooking)
async function checkRoomAvailability(roomId, checkinStr, checkoutStr) {
  if (!supabaseClient) {
    console.warn('Supabase não conectado. Ignorando validação.');
    return { available: true };
  }

  try {
    const normalize = (d) => (d && d.includes('/')) ? d.split('/').reverse().join('-') : d;
    const checkin = normalize(checkinStr);
    const checkout = normalize(checkoutStr);

    let targetRoomId = roomId;
    if (['switch', 'ps5', 'xbox'].includes(roomId)) targetRoomId = 'duo';
    if (roomId === 'pc') targetRoomId = 'solo';

    const { data, error } = await supabaseClient
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
    console.error('Erro na checagem Supabase:', err.message);
    return { available: true, error: err.message };
  }
}

// ==========================================
// AUTENTICAÇÃO E GESTÃO DE CONTAS (SUPABASE)
// ==========================================

// 5. Registar novo utilizador no banco de dados
async function registerUserInDB(userData) {
  const client = getSupabaseClient(); // Garante a reconexão em tempo real
  
  if (!client) {
    return { success: false, message: 'Supabase não conectado. Verifique se o SDK foi carregado.' };
  }

  const cleanEmail = userData.email.trim().toLowerCase();
  const cleanTag = userData.gamerTag.trim();

  try {
    // 1. Verifica se o e-mail já existe
    const { data: emailMatch, error: emailErr } = await client
      .from('users')
      .select('id')
      .ilike('email', cleanEmail)
      .limit(1);

    if (emailErr) throw emailErr;

    if (emailMatch && emailMatch.length > 0) {
      return { success: false, message: 'Este e-mail já está em uso por outro jogador!' };
    }

    // 2. Verifica se a GamerTag já existe
    const { data: tagMatch, error: tagErr } = await client
      .from('users')
      .select('id')
      .ilike('gamer_tag', cleanTag)
      .limit(1);

    if (tagErr) throw tagErr;

    if (tagMatch && tagMatch.length > 0) {
      return { success: false, message: 'Esta GamerTag já foi resgatada por outro player!' };
    }

    // 3. Insere o novo usuário com papel comum ('user')
    const { data, error } = await client
      .from('users')
      .insert([
        {
          full_name: userData.fullName,
          gamer_tag: cleanTag,
          email: cleanEmail,
          password: userData.password,
          role: 'user'
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, user: data[0] };
  } catch (err) {
    console.error('Erro no registo de utilizador:', err.message);
    return { success: false, message: 'Falha ao salvar no banco: ' + err.message };
  }
}

// 6. Iniciar sessão validando no PostgreSQL
async function loginUserInDB(identifier, password) {
  const client = getSupabaseClient(); // Garante a reconexão em tempo real

  if (!client) {
    return { success: false, message: 'Supabase não conectado. Verifique se o SDK foi carregado.' };
  }

  const cleanId = identifier.trim();

  try {
    let query = client
      .from('users')
      .select('id, full_name, gamer_tag, email, password, role');

    // Se possui @ busca pelo e-mail, caso contrário busca pela GamerTag
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
        role: user.role || 'user'
      }
    };
  } catch (err) {
    console.error('Erro na autenticação:', err.message);
    return { success: false, message: 'Falha ao autenticar no servidor: ' + err.message };
  }
}

// ==========================================
// FUNÇÕES ADMINISTRATIVAS (PAINEL MASTER ADM)
// ==========================================

// 7. Buscar todas as reservas cadastradas
async function fetchAllReservations() {
  if (!supabaseClient) {
    return { success: false, data: [] };
  }

  try {
    const { data, error } = await supabaseClient
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Erro ao buscar todas as reservas:', err.message);
    return { success: false, error: err.message, data: [] };
  }
}

// 8. Atualizar status de uma reserva (cancelamento pelo Admin)
async function updateReservationStatus(reservationCode, newStatus) {
  const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : supabaseClient;

  if (!client) {
    return { success: false, message: 'Supabase não conectado.' };
  }

  try {
    const { data, error } = await client
      .from('reservations')
      .update({ status: newStatus })
      .eq('reservation_code', reservationCode.trim())
      .select();

    if (error) throw error;

    return { success: true, data };
  } catch (err) {
    console.error('Erro ao atualizar status da reserva:', err.message);
    return { success: false, message: err.message };
  }
}

// Vincula ao escopo global
window.updateReservationStatus = updateReservationStatus;

// 9. Buscar todos os registros da fila de espera
async function fetchAllWaitlist() {
  const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : supabaseClient;

  if (!client) {
    return { success: false, data: [] };
  }

  try {
    const { data, error } = await client
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Erro ao buscar fila de espera:', err.message);
    return { success: false, error: err.message, data: [] };
  }
}

// Vincula ao escopo global para acesso pelo admin.html
window.fetchAllWaitlist = fetchAllWaitlist;