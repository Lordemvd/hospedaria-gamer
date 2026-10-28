// ==========================================
// CONFIGURAÇÃO DO SUPABASE (NEXUS INN)
// ==========================================

const SUPABASE_URL = 'https://jccjjyvryepfnrenqhbi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0zpUzcOfgIlHxhgDtShkpQ_G7xGOHxH';

// Inicializa o cliente Supabase via CDN
const supabaseClient = (typeof window !== 'undefined' && window.supabase) 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

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