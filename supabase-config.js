// ============================================
// CONFIGURAÇÃO SUPABASE - ClimaExpert
// ============================================

// IMPORTANTE: Você precisa preencher suas credenciais aqui!
// Vá em: https://supabase.com/dashboard/project/covyacelgxbihpxkabe/settings/api

// 1. Project URL (já preenchido com base no seu Project ID)
const SUPABASE_URL = 'https://covyacelgxbihpxkabe.supabase.co';

// 2. anon/public key (VOCÊ PRECISA COPIAR ISSO DO DASHBOARD)
// Vá em Settings > API > Project API keys > anon public
// É uma string longa que começa com "eyJ..."
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvdnlhY2VsZ3hiaWhncHhrYWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTg5MjIsImV4cCI6MjA4NjEzNDkyMn0.KnVrZpNBcN4Ym5EBspfg2ipBF_5GdmP6PY2KLGwbdLc';

// ============================================
// NÃO MODIFICAR ABAIXO DESTA LINHA
// ============================================

// Verificar se as credenciais foram configuradas
if (SUPABASE_ANON_KEY === 'COLE_SUA_CHAVE_AQUI') {
    console.error('⚠️ ATENÇÃO: Configure sua chave do Supabase no arquivo supabase-config.js');
    console.error('Vá em: https://supabase.com/dashboard/project/covyacelgxbihpxkabe/settings/api');
}

// Criar cliente Supabase
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// EXPOR O CLIENTE NA JANELA (Garantir que main.js veja o cliente, não a biblioteca)
window.supabase = client;

// Verificar conexão
// Verificar conexão com logs detalhados
console.log('Iniciando conexão com Supabase...');
console.log('URL:', SUPABASE_URL);

client // Usar a variável local 'client' para o teste imediato
    .from('users')
    .select('count', { count: 'exact', head: true })
    .then(({ data, error }) => {
        if (error) {
            console.error('❌ ERRO CRÍTICO ao conectar com Supabase:', error);
            console.error('Mensagem:', error.message);
            console.error('Detalhes:', error.details);
            console.error('Dica:', error.hint);
            alert('Erro de conexão com o banco de dados. Verifique o console (F12) para detalhes.');
        } else {
            console.log('✅ Supabase conectado com sucesso!');
        }
    })
    .catch(err => {
        console.error('❌ ERRO DE REDE/CORS:', err);
    });
