import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { substituicaoPorSubstituto } from '../services/substituicaoService';
import { listarBombeiros } from '../services/bombeiroService';
import { listarAPOCs } from '../services/apocService';

export type UserRole = 'admin_master' | 'admin' | 'gerente' | 'chefe' | 'lider';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin_master: 'Desenvolvedor',
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
    return JSON.parse(raw) as User;
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

  if (!users['admin_master']) {
    users['admin_master'] = { name: 'Administrador Master', password: 'admin_master', role: 'admin_master' };
    changed = true;
  } else if (users['admin_master'].role !== 'admin_master') {
    users['admin_master'].role = 'admin_master';
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
}

const ROLE_HIERARQUIA: UserRole[] = ['admin_master', 'admin', 'gerente', 'chefe', 'lider'];

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
    await new Promise(r => setTimeout(r, 600));
    const users = getStoredUsers();
    const stored = users[username];
    if (!stored || stored.password !== password) {
      throw new Error('Usuário ou senha inválidos.');
    }

    const userData: User = {
      name: stored.name,
      username,
      avatar: stored.name.charAt(0).toUpperCase(),
      role: stored.role || 'chefe',
    };

    if (stored.personId && stored.personType) {
      try {
        if (stored.personType === 'bombeiro') {
          const bombeiros = await listarBombeiros();
          const b = bombeiros.find(p => p.id === stored.personId);
          if (b) {
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
      const bombeiros = await listarBombeiros();
      const bombeiro = bombeiros.find(b => b.nomeCompleto === stored.name || b.email === username);
      if (bombeiro) {
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
    }

    setUser(userData);
    saveSession(userData);
  }, []);

  const register = useCallback(async (name: string, username: string, password: string, role: UserRole, personId?: string, personType?: 'bombeiro' | 'apoc') => {
    await new Promise(r => setTimeout(r, 600));
    const users = getStoredUsers();
    if (users[username]) {
      throw new Error('Nome de usuário já existe.');
    }
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

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, effectiveRole, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
