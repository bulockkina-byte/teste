import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { substituicaoPorSubstituto } from '../services/substituicaoService';
import { listarBombeiros } from '../services/bombeiroService';

export type UserRole = 'admin_master' | 'admin' | 'gerente' | 'chefe' | 'lider';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin_master: 'Administrador Master',
  admin: 'Administrador',
  gerente: 'Gerente da Seção de Combate a Incêndio',
  chefe: 'Chefe de Equipe',
  lider: 'Líder de Resgate',
};

interface User {
  name: string;
  username: string;
  avatar: string;
  role: UserRole;
  substituindoDe?: string;
  substituindoFuncao?: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  effectiveRole: UserRole;
  login: (username: string, password: string) => Promise<void>;
  register: (name: string, username: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
}

export interface StoredUser {
  name: string;
  password: string;
  role: UserRole;
}

const USERS_KEY = 'sescinc-users';

function getStoredUsers(): Record<string, StoredUser> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  } catch {
    return {};
  }
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => { seedAdmin(); }, []);

  const login = useCallback(async (username: string, password: string) => {
    await new Promise(r => setTimeout(r, 600));
    const users = getStoredUsers();
    const stored = users[username];
    if (!stored || stored.password !== password) {
      throw new Error('Usuário ou senha inválidos.');
    }

    const bombeiros = listarBombeiros();
    const bombeiro = bombeiros.find(b => b.nomeCompleto === stored.name || b.email === username);
    let substituicao = null;
    if (bombeiro) {
      substituicao = substituicaoPorSubstituto(bombeiro.id);
    }

    const userData: User = {
      name: stored.name,
      username,
      avatar: stored.name.charAt(0).toUpperCase(),
      role: stored.role || 'chefe',
    };

    if (substituicao && bombeiro) {
      const subRole = cargoParaUserRole(substituicao.funcaoSubstituicao);
      if (subRole) {
        userData.substituindoDe = substituicao.funcionarioNome;
        userData.substituindoFuncao = subRole;
      }
    }

    setUser(userData);
  }, []);

  const register = useCallback(async (name: string, username: string, password: string, role: UserRole) => {
    await new Promise(r => setTimeout(r, 600));
    const users = getStoredUsers();
    if (users[username]) {
      throw new Error('Nome de usuário já existe.');
    }
    users[username] = { name, password, role };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

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
