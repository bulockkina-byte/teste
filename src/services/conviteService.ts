const CONVITES_KEY = 'sescinc-convites';

export interface Convite {
  codigo: string;
  usado: boolean;
  createdAt: string;
  usadoEm?: string;
  registradoPor?: string;
}

function gerarCodigo(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = '';
  for (let i = 0; i < 8; i++) {
    codigo += chars[Math.floor(Math.random() * chars.length)];
  }
  return codigo;
}

function getConvites(): Record<string, Convite> {
  try {
    return JSON.parse(localStorage.getItem(CONVITES_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveConvites(convites: Record<string, Convite>) {
  localStorage.setItem(CONVITES_KEY, JSON.stringify(convites));
}

export function criarConvite(): Convite {
  const convites = getConvites();
  let codigo = gerarCodigo();
  while (convites[codigo]) codigo = gerarCodigo();
  const convite: Convite = { codigo, usado: false, createdAt: new Date().toISOString() };
  convites[codigo] = convite;
  saveConvites(convites);
  return convite;
}

export function validarConvite(codigo: string): Convite | null {
  const convites = getConvites();
  const convite = convites[codigo];
  if (!convite || convite.usado) return null;
  return convite;
}

export function usarConvite(codigo: string, registradoPor: string): void {
  const convites = getConvites();
  if (convites[codigo]) {
    convites[codigo].usado = true;
    convites[codigo].usadoEm = new Date().toISOString();
    convites[codigo].registradoPor = registradoPor;
    saveConvites(convites);
  }
}

export function listarConvites(): Convite[] {
  return Object.values(getConvites()).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
