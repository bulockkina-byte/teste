import type { ChatMensagem } from '../types/chat';

const STORAGE_KEY = 'sescinc-chat';

function getAll(): ChatMensagem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: ChatMensagem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listarMensagens(): ChatMensagem[] {
  return getAll();
}

export function mensagensGerais(): ChatMensagem[] {
  return getAll().filter(m => m.para === null);
}

export function mensagensPrivadas(usuario: string): ChatMensagem[] {
  return getAll().filter(m => m.para === usuario || m.de === usuario);
}

export function conversaCom(usuario1: string, usuario2: string): ChatMensagem[] {
  return getAll().filter(m =>
    (m.de === usuario1 && m.para === usuario2) ||
    (m.de === usuario2 && m.para === usuario1)
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function enviarMensagem(data: Omit<ChatMensagem, 'id' | 'createdAt' | 'lida'>): ChatMensagem {
  const all = getAll();
  const msg: ChatMensagem = {
    ...data,
    id: crypto.randomUUID(),
    lida: false,
    createdAt: new Date().toISOString(),
  };
  all.push(msg);
  saveAll(all);
  return msg;
}

export function marcarLida(id: string) {
  const all = getAll();
  const idx = all.findIndex(m => m.id === id);
  if (idx !== -1) {
    all[idx].lida = true;
    saveAll(all);
  }
}

export function contarNaoLidas(usuario: string): number {
  return getAll().filter(m => m.para === usuario && !m.lida).length;
}
