import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { substituicaoPorSubstituto } from '../services/substituicaoService';
import { listarBombeiros } from '../services/bombeiroService';
import { listarAPOCs } from '../services/apocService';
import {
  buscarUsuarioPorUsername,
  criarUsuario,
  atualizarUsuario,
} from '../services/usuarioService';

export type UserRole = 'desenvolvedor' | 'admin' | 'gerente' | 'chefe' | 'lider';

export const ROLE_LABELS: Record<UserRole, string> = {
  desenvolvedor: 'Desenvolvedor',
  admin: 'Administrador',
  gerente: 'Gerente da Seção de Combate a Incêndio',
  chefe: 'Chefe de Equipe',
  lider: 'Líder de Resgate',
};

export interface PessoaVinculada {
  nomeGuerra: string;
  foto?: string;
  funcao: string;
  personType: 'bombeiro' | 'apoc';
}

interface User {
  name: string;
  username: string;
  avatar: string;
  role: UserRole;
  substituindoDe?: string;
  substituindoFuncao?: UserRole;
  pessoa?: PessoaVinculada;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  effectiveRole: UserRole;
  login: (username: string, password: string) => Promise<void>;
  register: (name: string, username: string, password: string, role: UserRole, personId?: string, personType?: 'bombeiro' | 'apoc') => Promise<void>;
  logout: () => void;
}

export interface StoredUser {
  name: string;
  password: string;
  role: UserRole;
  previousRole?: UserRole;
  personId?: string;
  personType?: 'bombeiro' | 'apoc';
}

const USERS_KEY = 'sescinc-users';
const SESSION_KEY = 'sescinc-session';
const IDLE_TIMEOUT = 10 * 60 * 1000;

function getStoredUsers(): Record<string, StoredUser> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveSession(user: User) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function loadSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as User;
    if (session.username === 'serra' && session.role !== 'desenvolvedor') {
      session.role = 'desenvolvedor';
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
    if (session.username === 'admin' && session.role !== 'admin') {
      session.role = 'admin';
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
    return session;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  effectiveRole: 'chefe',
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

function seedAdmin() {
  const users = getStoredUsers();
  let changed = false;

  if (users['admin_master']) {
    const saved = users['admin_master'];
    delete users['admin_master'];
    if (!users['serra']) {
      users['serra'] = { ...saved, role: 'desenvolvedor' };
      changed = true;
    }
    changed = true;
  }

  try {
    const sessionRaw = localStorage.getItem('sescinc-session');
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      if (session.username === 'admin_master') {
        localStorage.removeItem('sescinc-session');
      }
    }
    const presenceRaw = localStorage.getItem('sescinc-presence');
    if (presenceRaw) {
      const presence: Record<string, number> = JSON.parse(presenceRaw);
      if ('admin_master' in presence) {
        delete presence['admin_master'];
        localStorage.setItem('sescinc-presence', JSON.stringify(presence));
      }
    }
  } catch { /* ignore */ }

  if (!users['serra']) {
    users['serra'] = { name: 'Serra', password: 'serra', role: 'desenvolvedor' };
    changed = true;
  } else if (users['serra'].role !== 'desenvolvedor') {
    users['serra'].role = 'desenvolvedor';
    changed = true;
  }

  if (!users['admin']) {
    users['admin'] = { name: 'Administrador', password: 'admin', role: 'admin' };
    changed = true;
  } else if (users['admin'].role !== 'admin') {
    users['admin'].role = 'admin';
    changed = true;
  }

  if (changed) localStorage.setItem(USERS_KEY, JSON.stringify(users));

  syncSeedsToSupabase(users).catch(() => {});
}

async function syncSeedsToSupabase(users: Record<string, StoredUser>) {
  for (const uname of Object.keys(users)) {
    const local = users[uname];
    if (!local) continue;
    try {
      const existing = await buscarUsuarioPorUsername(uname);
      if (!existing) {
        await criarUsuario({
          username: uname,
          name: local.name,
          password: local.password,
          role: local.role,
          personId: local.personId,
          personType: local.personType,
        });
      } else if (existing.password !== local.password || existing.role !== local.role) {
        await atualizarUsuario(uname, {
          password: local.password,
          role: local.role,
          previousRole: local.previousRole,
          personId: local.personId,
          personType: local.personType,
        });
      }
    } catch { /* ignore - Supabase offline */ }
  }
}

const ROLE_HIERARQUIA: UserRole[] = ['desenvolvedor', 'admin', 'gerente', 'chefe', 'lider'];

function cargoParaUserRole(cargo: string): UserRole | null {
  if (cargo === 'GS') return 'gerente';
  if (cargo === 'BA-CE') return 'chefe';
  if (cargo === 'BA-LR') return 'lider';
  return null;
}

function apocParaUserRole(funcao: string): UserRole {
  if (funcao === 'supervisor') return 'gerente';
  return 'chefe';
}

export { cargoParaUserRole, apocParaUserRole };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadSession());

  useEffect(() => { seedAdmin(); }, []);

  useEffect(() => {
    if (user && user.username === 'admin_master') {
      clearSession();
      setUser(null);
      return;
    }
    if (user && user.role === 'admin_master') {
      setUser(prev => prev ? { ...prev, role: 'desenvolvedor' } : prev);
    }
    if (user?.username === 'serra' && user.role !== 'desenvolvedor') {
      setUser(prev => prev ? { ...prev, role: 'desenvolvedor' } : prev);
      const users = getStoredUsers();
      if (users['serra']) {
        users['serra'].role = 'desenvolvedor';
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
    }
    if (user?.username === 'admin' && user.role !== 'admin') {
      setUser(prev => prev ? { ...prev, role: 'admin' } : prev);
      const users = getStoredUsers();
      if (users['admin']) {
        users['admin'].role = 'admin';
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (user?.username) {
          try {
            const raw = localStorage.getItem('sescinc-presence');
            if (raw) {
              const data: Record<string, number> = JSON.parse(raw);
              delete data[user.username];
              localStorage.setItem('sescinc-presence', JSON.stringify(data));
            }
          } catch { /* ignore */ }
        }
        clearSession();
        setUser(null);
      }, IDLE_TIMEOUT);
    };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [user]);

  const login = useCallback(async (username: string, password: string) => {
    const ATTEMPTS_KEY = 'sescinc-login-attempts';
    const MAX_ATTEMPTS = 5;
    const BLOCK_MINUTES = 15;

    let attempts: Record<string, { count: number; firstAttempt: string }> = {};
    try { attempts = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}'); } catch { /* ignore */ }

    const userAttempts = attempts[username];
    if (userAttempts && userAttempts.count >= MAX_ATTEMPTS) {
      const elapsed = Date.now() - new Date(userAttempts.firstAttempt).getTime();
      const remaining = BLOCK_MINUTES * 60 * 1000 - elapsed;
      if (remaining > 0) {
        const mins = Math.ceil(remaining / 60000);
        throw new Error(`Conta bloqueada por ${mins} minuto(s) devido a múltiplas tentativas inválidas.`);
      }
      delete attempts[username];
    }

    await new Promise(r => setTimeout(r, 600));
    let users = getStoredUsers();
    let stored = users[username];

    try {
      const remote = await buscarUsuarioPorUsername(username);
      if (remote && remote.password === password) {
        stored = {
          name: remote.name,
          password: remote.password,
          role: remote.role,
          previousRole: remote.previousRole,
          personId: remote.personId,
          personType: remote.personType,
        };
        users[username] = stored;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      } else if (remote) {
        stored = null;
      }
    } catch (err) {
      console.error('Erro ao buscar usuario no Supabase:', err);
      if (!stored || stored.password !== password) {
        throw new Error('Erro ao conectar com o servidor. Tente novamente.');
      }
    }

    if (!stored || stored.password !== password) {
      const now = new Date().toISOString();
      if (!attempts[username]) attempts[username] = { count: 0, firstAttempt: now };
      attempts[username].count++;
      if (attempts[username].count === 1) attempts[username].firstAttempt = now;
      localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
      const tentativasRestantes = MAX_ATTEMPTS - attempts[username].count;
      throw new Error(`Usuário ou senha inválidos. ${tentativasRestantes > 0 ? `${tentativasRestantes} tentativa(s) restante(s).` : 'Conta bloqueada por 15 minutos.'}`);
    }

    delete attempts[username];
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));

    const roleGarantida: UserRole = username === 'serra'
      ? 'desenvolvedor'
      : username === 'admin'
        ? 'admin'
        : stored.role || 'chefe';

    if (roleGarantida !== stored.role) {
      stored.role = roleGarantida;
      users[username] = stored;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    const userData: User = {
      name: stored.name,
      username,
      avatar: stored.name.charAt(0).toUpperCase(),
      role: roleGarantida,
    };

    if (stored.personId && stored.personType) {
      try {
        if (stored.personType === 'bombeiro') {
          const bombeiros = await listarBombeiros();
          const b = bombeiros.find(p => p.id === stored.personId);
          if (b) {
            userData.name = b.nomeCompleto;
            userData.pessoa = {
              nomeGuerra: b.nomeGuerra,
              foto: b.foto || undefined,
              funcao: b.cargo,
              personType: 'bombeiro',
            };
            const substituicao = substituicaoPorSubstituto(b.id);
            if (substituicao) {
              const subRole = cargoParaUserRole(substituicao.funcaoSubstituicao);
              if (subRole) {
                userData.substituindoDe = substituicao.funcionarioNome;
                userData.substituindoFuncao = subRole;
              }
            }
          }
        } else if (stored.personType === 'apoc') {
          const apocs = await listarAPOCs();
          const a = apocs.find(p => p.id === stored.personId);
          if (a) {
            userData.name = a.nomeCompleto;
            userData.pessoa = {
              nomeGuerra: a.nomeGuerra,
              foto: undefined,
              funcao: a.funcao,
              personType: 'apoc',
            };
          }
        }
      } catch { /* ignore - fallback to basic user data */ }
    } else {
      try {
        const bombeiros = await listarBombeiros();
        const bombeiro = bombeiros.find(b => b.nomeCompleto === stored.name || b.email === username);
        if (bombeiro) {
          userData.name = bombeiro.nomeCompleto;
          userData.pessoa = {
            nomeGuerra: bombeiro.nomeGuerra,
            foto: bombeiro.foto || undefined,
            funcao: bombeiro.cargo,
            personType: 'bombeiro',
          };
          const substituicao = substituicaoPorSubstituto(bombeiro.id);
          if (substituicao) {
            const subRole = cargoParaUserRole(substituicao.funcaoSubstituicao);
            if (subRole) {
              userData.substituindoDe = substituicao.funcionarioNome;
              userData.substituindoFuncao = subRole;
            }
          }
        }
      } catch { /* ignore - Supabase offline or table missing */ }
    }

    setUser(userData);
    saveSession(userData);
  }, []);

  const register = useCallback(async (name: string, username: string, password: string, role: UserRole, personId?: string, personType?: 'bombeiro' | 'apoc') => {
    await new Promise(r => setTimeout(r, 600));

    const existing = await buscarUsuarioPorUsername(username);
    if (existing) {
      throw new Error('Nome de usuário já existe.');
    }
    await criarUsuario({ username, name, password, role, personId, personType });

    const users = getStoredUsers();
    users[username] = { name, password, role, personId, personType };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, []);

  const logout = useCallback(() => {
    if (user?.username) {
      try {
        const raw = localStorage.getItem('sescinc-presence');
        if (raw) {
          const data: Record<string, number> = JSON.parse(raw);
          delete data[user.username];
          localStorage.setItem('sescinc-presence', JSON.stringify(data));
        }
      } catch { /* ignore */ }
    }
    clearSession();
    setUser(null);
  }, [user]);

  const effectiveRole = useMemo(() => {
    if (!user) return 'chefe';
    if (user.substituindoFuncao) {
      const userIdx = ROLE_HIERARQUIA.indexOf(user.role);
      const subIdx = ROLE_HIERARQUIA.indexOf(user.substituindoFuncao);
      return subIdx < userIdx ? user.substituindoFuncao : user.role;
    }
    return user.role;
  }, [user]);

  const contextValue = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    effectiveRole,
    login,
    register,
    logout,
  }), [user, effectiveRole, login, register, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
