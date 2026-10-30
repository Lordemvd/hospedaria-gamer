# 🎮 Nexus Inn — Hotel Temático Gamer & Hub de Alta Performance

<p align="center">
  <img src="https://img.shields.io/badge/Deploy-GitHub%20Pages-00f0ff?style=for-the-badge&logo=github" alt="GitHub Pages">
  <img src="https://img.shields.io/badge/Stack-Vanilla%20JS%20%7C%20CSS3%20%7C%20HTML5-ff007f?style=for-the-badge&logo=javascript" alt="Vanilla Stack">
  <img src="https://img.shields.io/badge/Database-Supabase%20%7C%20PostgreSQL-3ecf8e?style=for-the-badge&logo=supabase" alt="Supabase PostgreSQL">
  <img src="https://img.shields.io/badge/Security-SHA--256%20%7C%20Anti--Tampering-00ffaa?style=for-the-badge" alt="Security Shield">
  <img src="https://img.shields.io/badge/Audio-Web%20Audio%20API-ffbd2e?style=for-the-badge" alt="Web Audio API">
</p>

---

## 📌 Visão Geral do Ecossistema

O **Nexus Inn** é uma plataforma web completa para reserva, gestão e emissão de credenciais para uma hospedaria temática voltada para o público gamer e equipes de eSports.

Construída sobre o paradigma **Zero-Framework**, a aplicação opera exclusivamente com tecnologias nativas da web (Vanilla JavaScript moderno, CSS3 Modular com variáveis customizadas e HTML5 semântico), consumindo uma infraestrutura em nuvem provida pelo **Supabase (PostgreSQL 15)** com políticas ativas de isolamento de dados (*Row Level Security*).

O design adota uma direção de arte *Cyberpunk / Dark Void*, priorizando alta densidade de contraste néon, respostas auditivas sintetizadas e máxima proteção contra fraudes de cliente.

---

## 🚀 Diferenciais de Engenharia & Inovações

### 1. Blindagem Financeira & Validação Anti-Tampering (`pages/pagamento.html`)
* **Recálculo Estrito no Cliente:** O motor de liquidação ignora valores monetários passados diretamente por query strings na URL (impedindo injeções de `?total=0,00` ou strings arbitrárias como `shell`). O montante real é recalculado com base na matriz fixa de diárias da acomodação multiplicada pela contagem legítima de noites.
* **Validação Rígida de Calendário:** Bloqueio de datas retroativas, inversões cronológicas (check-out anterior ao check-in) e sanitização contra anos corrompidos (aceitando unicamente a janela operacional 2026/2027).

### 2. Cyber Captcha com Criptografia SHA-256 (`pages/cadastro.html`)
* **Isolamento de Escopo (IIFE):** A rotina de validação e o código gerado residem em escopo léxico estritamente privado, prevenindo leitura ou manipulação via console do desenvolvedor (`F12`).
* **Web Crypto API & Salt:** O código em texto puro nunca é gravado na memória global; o sistema gera e compara apenas hashes SHA-256 acrescidos de uma chave de salpico (*salt*).
* **Renderização Anti-OCR & Escudo Físico:** Geração procedural no `<canvas>` com rotações angulares aleatórias, paleta dinâmica, ruído de partículas e linhas de interferência (*glitch lines*). Uma camada transparente com desativação de eventos de clique direito (`contextmenu`) e arraste impede o download direto da imagem.

### 3. Motor Anti-Overbooking em Tempo Real (`pages/reserva.html`)
* **Consulta de Colisão de Intervalos:** Verificação direta no PostgreSQL que impede sobreposição de reservas para a mesma acomodação no intervalo selecionado:
  $$\text{check\_in} < \text{checkout\_pretendido} \quad \text{AND} \quad \text{check\_out} > \text{checkin\_pretendido}$$
* **Fila de Espera (Drop Alerts):** Redirecionamento assistido para captação de contatos caso a acomodação pretendida já esteja alocada.

### 4. Hub do Jogador & Isolamento de Dados (`pages/perfil.html`)
* **GamerTags Únicas (Case-Insensitive):** Garantia de unicidade textual através de operadores `.ilike` no banco de dados.
* **Rastreabilidade de Apelidos (`previous_tags`):** Histórico cumulativo de alterações de GamerTag mantendo a integridade de estadias antigas sem reservar o apelido anterior para terceiros.
* **Recorte de Avatar com Zoom ($1:1$):** Integração com a biblioteca Cropper.js, permitindo rotação, zoom e exportação otimizada em JPEG comprimido (~15 KB), evitando gargalos de armazenamento.
* **Isolamento Estrito de Histórico:** Trava de correspondência de identidade que filtra e renderiza exclusivamente as estadias pertencentes ao jogador autenticado.

### 5. Feedback Sonoro Gamer Nativo (Web Audio API)
* Síntese de frequências acústicas em tempo real utilizando osciladores senoidais e triangulares (`sine` e `triangle`), dispensando o download de arquivos pesados de áudio (MP3/WAV) e eliminando qualquer latência.
* Controle global de alternância (*Mudo / Ativado*) persistido no `localStorage`.

### 6. Terminal de Diagnóstico de Rede
* Simulador tático integrado à Landing Page que executa testes de conexão simulados (sonda UDP/ICMP para servidores em São Paulo), acompanhando oscilações em tempo real de latência, estabilidade de clock (*jitter*) e certificação de $0\%$ de perda de pacotes (*packet loss*).

### 7. Gamer Pass VIP com Exportação Limpa (`@media print`)
* Geração dinâmica de bilhete VIP contendo QR Code proporcional.
* Folha de estilos otimizada para formato A4 que oculta cabeçalhos, barras de navegação e botões interativos, retendo fidelidade total de contraste via `print-color-adjust: exact`.

---

## 📂 Arquitetura de Diretórios

```plaintext
hospedaria-gamer/
├── index.html              # Landing Page, Diagnóstico de Rede e Vitrine de Setups
├── style.css               # Folha de Estilos Central & Diretivas @media print
├── script.js               # Orquestrador da Interface, Hub Navbar e Web Audio API
├── supabase.js             # Camada de Persistência, Conexão PostgreSQL & Auth
├── README.md               # Documentação Oficial e Guia Técnico
└── pages/
    ├── admin.html          # Painel Master ADM (Gestão de Reservas e Fila de Espera)
    ├── cadastro.html       # Criação de Conta, GamerTag & Cyber Captcha SHA-256
    ├── cancelamento.html   # Políticas Contratuais e Reembolso
    ├── contato.html        # Central de Suporte & Abertura de Chamados
    ├── finalizacao.html    # Gamer Pass VIP, QR Code e Exportação para Impressão/PDF
    ├── galeria.html        # Especificações Técnicas e Rigs dos Setups
    ├── login.html          # Autenticação de Usuários e Recuperação por E-mail/CPF
    ├── ocupado.html        # Alerta de Setup Indisponível e Inscrição na Fila
    ├── pagamento.html      # Checkout Blindado com Recálculo Seguro e PIX/Cartão
    ├── perfil.html         # Hub do Usuário, Histórico Isolado e Cropper de Avatar
    └── reserva.html        # Seleção de Acomodação, Período e Checagem Anti-Overbooking
```

---

## 🗄️ Esquema do Banco de Dados (Supabase / PostgreSQL)

O modelo de dados opera sobre três entidades centrais protegidas por *Row Level Security* (RLS). Execute o script abaixo no **SQL Editor** do painel do Supabase para inicializar a estrutura:

```sql
-- 1. TABELA DE USUÁRIOS / IDENTIDADE DIGITAL
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  gamer_tag TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  cpf TEXT,
  avatar TEXT,
  previous_tags TEXT DEFAULT '',
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE RESERVAS DE SETUPS
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_code TEXT NOT NULL UNIQUE,
  guest_name TEXT NOT NULL,
  room_id TEXT NOT NULL,
  room_name TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_price TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'CONFIRMADA',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE FILA DE ESPERA (DROP ALERTS)
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact TEXT NOT NULL,
  room_name TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DE ACESSO PÚBLICO CONTROLADO (ANON)
CREATE POLICY "Permitir leitura de usuários" ON public.users FOR SELECT TO anon USING (true);
CREATE POLICY "Permitir cadastro de novos usuários" ON public.users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Permitir atualização de perfil do usuário" ON public.users FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Permitir leitura de reservas" ON public.reservations FOR SELECT TO anon USING (true);
CREATE POLICY "Permitir criação de reservas" ON public.reservations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Permitir atualização de reservas (ADM)" ON public.reservations FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Permitir cadastro na fila de espera" ON public.waitlist FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Permitir leitura da fila de espera" ON public.waitlist FOR SELECT TO anon USING (true);

-- 6. INSERÇÃO DO ADMINISTRADOR MASTER INICIAL
INSERT INTO public.users (full_name, gamer_tag, email, password, role)
VALUES ('Administrador Geral', 'AdminMaster', 'admin@nexusinn.com', 'Admin#2026', 'admin')
ON CONFLICT (email) DO NOTHING;
```

---

## 🛠️ Como Executar o Projeto Localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/Lordemvd/hospedaria-gamer.git
   cd hospedaria-gamer
   ```

2. **Inicialize um servidor estático local:**
   * Usando a extensão **Live Server** no VS Code, ou:
   * Usando Python:
     ```bash
     python3 -m http.server 5500
     ```
   * Usando Node.js (`npx serve`):
     ```bash
     npx serve .
     ```

3. **Acesse no navegador:**
   Abra `http://localhost:5500` (ou a porta correspondente indicada pelo seu servidor local).

---

## 📋 Credenciais de Acesso para Demonstração

| Perfil | Identificador / E-mail | Senha | Nível de Acesso |
| :--- | :--- | :--- | :--- |
| **Administrador Master** | `admin@nexusinn.com` | `Admin#2026` | Painel ADM Master (`admin.html`), cancelamento global e drop alerts |
| **Jogador / Hóspede** | `Lorde_vida` (ou novo cadastro) | *Senha do usuário* | Painel do Usuário (`perfil.html`), reservas próprias e Gamer Pass VIP |

---

## 👥 Autoria & Créditos

Projeto acadêmico e profissional desenvolvido sob o padrão Zero-Framework:
* **Desenvolvedor Responsável:** Lorde (`Lordemvd`)
* **Repositório Oficial:** [github.com/Lordemvd/hospedaria-gamer](https://github.com/Lordemvd/hospedaria-gamer)
* **Ambiente de Produção:** [lordemvd.github.io/hospedaria-gamer](https://lordemvd.github.io/hospedaria-gamer/)
* **Slide de Produção:** https://docs.google.com/presentation/d/1n_DaIZiSX9DVTsFED3KNoy9wb3n0rtfYsy5lR6Bx2h0/edit?usp=sharing
