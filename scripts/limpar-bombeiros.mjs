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

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const { error, count } = await supabase
  .from('bombeiros')
  .delete({ count: 'exact' })
  .neq('id', '00000000-0000-0000-0000-000000000000');

if (error) {
  console.error('❌ Erro ao deletar:', error.message);
  process.exit(1);
}

const { count: restante, error: err2 } = await supabase
  .from('bombeiros')
  .select('*', { count: 'exact', head: true });

if (err2) console.error('Erro ao contar:', err2.message);
console.log(`✅ ${count} bombeiros deletados. Restam ${restante ?? '?'} na tabela.`);
