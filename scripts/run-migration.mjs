import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envRaw = readFileSync(resolve(import.meta.dirname, '..', '.env.local'), 'utf-8');
const env = Object.fromEntries(
  envRaw.split('\n').filter(Boolean).map(l => {
    const [k, ...v] = l.split('=');
    return [k.trim(), v.join('=').trim()];
  })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const steps = [
  `ALTER TABLE bombeiros ADD COLUMN IF NOT EXISTS credencial_validade TEXT DEFAULT '';`,
  `ALTER TABLE ferias_escala_item ADD COLUMN IF NOT EXISTS enviado BOOLEAN DEFAULT false;`,
  `ALTER TABLE substituicoes_temporarias ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'substituicao';`,
  `ALTER TABLE substituicoes_temporarias ADD COLUMN IF NOT EXISTS plantao_extra BOOLEAN DEFAULT false;`,
];

console.log('🔧 Aplicando migration...\n');

for (const sql of steps) {
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.log(`❌ RPC nao disponivel: ${error.message}`);
    console.log('\nExecute manualmente no Supabase Dashboard:');
    console.log('1. Acesse: https://supabase.com/dashboard/project/vopyrlgmwerzvpmjnyug');
    console.log('2. Va em SQL Editor');
    console.log('3. Cole e execute o conteudo de supabase/migrations/024_complete_schema_fix.sql\n');
    process.exit(1);
  }
  console.log(`   ✅ ${sql.split(' ').slice(0, 4).join(' ')}...`);
}

console.log('\n✅ Todas as colunas adicionadas!');

const { error: errSeed } = await supabase.rpc('criar_usuario_com_hash', {
  p_username: 'serra',
  p_name: 'Serra',
  p_password: 'serra',
  p_role: 'desenvolvedor',
  p_previous_role: null,
  p_person_id: null,
  p_person_type: null,
});

if (errSeed) {
  if (errSeed.message.includes('already exists')) {
    console.log('✅ Usuario "serra" ja existe!');
  } else {
    console.log('⚠️  Erro ao criar usuario "serra":', errSeed.message);
    console.log('   Pode criar manualmente pelo painel de Usuarios.');
  }
} else {
  console.log('✅ Usuario "serra" criado com sucesso!');
}
