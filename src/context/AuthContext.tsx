import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface User {
  name: string;
  username: string;
  avatar: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (name: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const USERS_KEY = 'sescinc-users';

function getStoredUsers(): Record<string, { name: string; password: string }> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

function seedAdmin() {
  const users = getStoredUsers();
  if (!users['admin']) {
    users['admin'] = { name: 'Administrador', password: 'admin' };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
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
    setUser({ name: stored.name, username, avatar: stored.name.charAt(0).toUpperCase() });
  }, []);

  const register = useCallback(async (name: string, username: string, password: string) => {
    await new Promise(r => setTimeout(r, 600));
    const users = getStoredUsers();
    if (users[username]) {
      throw new Error('Nome de usuário já existe.');
    }
    users[username] = { name, password };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
