import { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Bell, MessageCircle, Users, Send, Search, ArrowLeft,
  CheckCheck, Trash2, User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listarBombeiros } from '../../services/bombeiroService';
import {
  mensagensGerais, conversaCom, enviarMensagem, marcarLida, contarNaoLidas,
} from '../../services/chatService';

type RightTab = 'notificacoes' | 'chat' | 'contatos';
type ChatSubTab = 'geral' | 'privado';

interface Notificacao {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'info' | 'alerta' | 'sucesso' | 'erro';
  lida: boolean;
  createdAt: string;
}

function getNotificacoes(): Notificacao[] {
  const stored = localStorage.getItem('sescinc-notificacoes');
  if (stored) {
    try { return JSON.parse(stored); } catch { return []; }
  }
  return [
    { id: '1', titulo: 'Bem-vindo ao SESCINC', descricao: 'Sistema atualizado com sucesso.', tipo: 'sucesso', lida: false, createdAt: new Date().toISOString() },
    { id: '2', titulo: 'Manutenção Programada', descricao: 'Viatura 01 em manutenção prevista para amanhã.', tipo: 'info', lida: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: '3', titulo: 'EPI Vencendo', descricao: '3 EPIs com CA vencendo nos próximos 30 dias.', tipo: 'alerta', lida: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  ];
}

function formatTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Agora';
  if (min < 60) return `${min}min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h`;
  const dias = Math.floor(hrs / 24);
  return `${dias}d`;
}

const TIPO_CORE: Record<string, string> = {
  info: 'bg-blue-500/15 text-blue-400',
  alerta: 'bg-yellow-500/15 text-yellow-400',
  sucesso: 'bg-green-500/15 text-green-400',
  erro: 'bg-red-500/15 text-red-400',
};

export function RightPanel({ onClose, openTab = 'notificacoes' }: { onClose: () => void; openTab?: RightTab }) {
  const { user } = useAuth();
  const username = user?.username || '';
  const [tab, setTab] = useState<RightTab>(openTab);
  const [chatSubTab, setChatSubTab] = useState<ChatSubTab>('geral');
  const [msg, setMsg] = useState('');
  const [busca, setBusca] = useState('');
  const [conversaComUser, setConversaComUser] = useState<string | null>(null);
  const [conversaComNome, setConversaComNome] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const bombeiros = useMemo(() => listarBombeiros(), []);

  useEffect(() => { setNotificacoes(getNotificacoes()); }, []);

  const usuariosFiltrados = useMemo(() => {
    if (!busca) return bombeiros;
    const t = busca.toLowerCase();
    return bombeiros.filter(b =>
      b.nomeCompleto.toLowerCase().includes(t) ||
      b.nomeGuerra.toLowerCase().includes(t)
    );
  }, [bombeiros, busca]);

  const gerais = useMemo(() => mensagensGerais(), [refresh]);
  const privadas = useMemo(() =>
    conversaComUser ? conversaCom(username, conversaComUser) : [], [username, conversaComUser, refresh]);
  const totalNaoLidas = useMemo(() => contarNaoLidas(username), [username, refresh]);
  const naoLidas = notificacoes.filter(n => !n.lida).length;

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [gerais, privadas, chatSubTab]);

  useEffect(() => {
    if (conversaComUser) {
      const msgs = conversaCom(username, conversaComUser);
      msgs.forEach(m => { if (!m.lida && m.de !== username) marcarLida(m.id); });
      setRefresh(r => r + 1);
    }
  }, [conversaComUser, username]);

  function handleSend() {
    if (!msg.trim()) return;
    enviarMensagem({
      de: username,
      deNome: user?.name || username,
      para: conversaComUser,
      paraNome: conversaComNome || null,
      texto: msg.trim(),
    });
    setMsg('');
    setRefresh(r => r + 1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function marcarTodasLidas() {
    const updated = notificacoes.map(n => ({ ...n, lida: true }));
    setNotificacoes(updated);
    localStorage.setItem('sescinc-notificacoes', JSON.stringify(updated));
  }

  function limparNotificacoes() {
    setNotificacoes([]);
    localStorage.removeItem('sescinc-notificacoes');
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDay(iso: string) {
    const d = new Date(iso);
    const hoje = new Date();
    if (d.toDateString() === hoje.toDateString()) return 'Hoje';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  const mensagensAtuais = chatSubTab === 'geral' ? gerais : privadas;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        onClick={e => e.stopPropagation()}
        className="relative flex h-full w-full max-w-[420px] flex-col border-l border-border-dark bg-surface-dark shadow-2xl shadow-black/40 animate-slideInRight"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-dark px-5 py-4">
          <div className="flex items-center gap-3">
            {conversaComUser ? (
              <button onClick={() => { setConversaComUser(null); setConversaComNome(''); }}
                className="rounded-lg p-1.5 text-graphite-400 transition-colors hover:bg-surface-card hover:text-graphite-200">
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : null}
            <div>
              <h2 className="text-base font-bold text-graphite-100">
                {conversaComUser ? conversaComNome :
                 tab === 'notificacoes' ? 'Notificações' :
                 tab === 'chat' ? 'Chat' : 'Contatos'}
              </h2>
              <p className="text-[11px] text-graphite-500">
                {conversaComUser ? 'Mensagem privada' :
                 tab === 'notificacoes' ? `${naoLidas} não lida(s)` :
                 tab === 'chat' ? 'Mensagem para todos ou privada' :
                 `${bombeiros.length} cadastrado(s)`}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="rounded-xl p-2 text-graphite-400 transition-all hover:bg-surface-card hover:text-graphite-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        {!conversaComUser && (
          <div className="flex border-b border-border-dark px-2">
            {([
              { key: 'notificacoes' as RightTab, icon: Bell, label: 'Notificações', badge: naoLidas },
              { key: 'chat' as RightTab, icon: MessageCircle, label: 'Chat', badge: totalNaoLidas },
              { key: 'contatos' as RightTab, icon: Users, label: 'Contatos', badge: 0 },
            ]).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`relative flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${
                  tab === t.key
                    ? 'text-aviation-400 after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-aviation-500'
                    : 'text-graphite-500 hover:text-graphite-300'
                }`}>
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
                {t.badge > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-alert-red px-1 text-[9px] font-bold text-white">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">

          {/* ─── NOTIFICAÇÕES ─── */}
          {tab === 'notificacoes' && !conversaComUser && (
            <div className="p-4">
              {notificacoes.length > 0 && (
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-medium text-graphite-500">{notificacoes.length} notificação(ões)</span>
                  <div className="flex gap-2">
                    <button onClick={marcarTodasLidas}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-graphite-400 transition-colors hover:bg-surface-card hover:text-graphite-200">
                      <CheckCheck className="h-3 w-3" /> Lidas
                    </button>
                    <button onClick={limparNotificacoes}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-graphite-400 transition-colors hover:bg-red-500/10 hover:text-red-400">
                      <Trash2 className="h-3 w-3" /> Limpar
                    </button>
                  </div>
                </div>
              )}

              {notificacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="mb-3 rounded-2xl bg-surface-card p-4">
                    <Bell className="h-8 w-8 text-graphite-600" />
                  </div>
                  <p className="text-sm font-medium text-graphite-400">Nenhuma notificação</p>
                  <p className="text-xs text-graphite-600">Tudo certo por aqui!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notificacoes.map(n => (
                    <div key={n.id}
                      className={`group relative rounded-xl border p-3.5 transition-all hover:shadow-md ${
                        n.lida
                          ? 'border-border-dark bg-surface-card/50'
                          : 'border-aviation-500/20 bg-surface-card'
                      }`}>
                      {!n.lida && (
                        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-aviation-500" />
                      )}
                      <div className="flex items-start gap-3">
                        <div className={`shrink-0 rounded-lg p-2 ${TIPO_CORE[n.tipo]}`}>
                          <Bell className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold ${n.lida ? 'text-graphite-400' : 'text-graphite-100'}`}>{n.titulo}</p>
                          <p className="mt-0.5 text-xs text-graphite-500 line-clamp-2">{n.descricao}</p>
                          <p className="mt-1.5 text-[10px] text-graphite-600">{formatTimeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── CHAT ─── */}
          {tab === 'chat' && !conversaComUser && (
            <>
              {/* Chat Sub-Tabs */}
              <div className="flex border-b border-border-dark px-2">
                <button onClick={() => setChatSubTab('geral')}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                    chatSubTab === 'geral'
                      ? 'text-aviation-400 border-b-2 border-aviation-500'
                      : 'text-graphite-500 hover:text-graphite-300'
                  }`}>
                  <Users className="h-3.5 w-3.5" /> Geral
                </button>
                <button onClick={() => setChatSubTab('privado')}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                    chatSubTab === 'privado'
                      ? 'text-aviation-400 border-b-2 border-aviation-500'
                      : 'text-graphite-500 hover:text-graphite-300'
                  }`}>
                  <User className="h-3.5 w-3.5" /> Privado
                  {totalNaoLidas > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-alert-red px-1 text-[9px] font-bold text-white">
                      {totalNaoLidas}
                    </span>
                  )}
                </button>
              </div>

              {/* Search (privado) */}
              {chatSubTab === 'privado' && (
                <div className="border-b border-border-dark px-4 py-2.5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-graphite-500" />
                    <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                      placeholder="Buscar pessoa..."
                      className="w-full rounded-xl border border-border-dark bg-surface-card py-2 pl-8 pr-3 text-xs text-graphite-100 placeholder-graphite-600 outline-none transition-colors focus:border-aviation-500/50" />
                  </div>
                </div>
              )}

              {/* Mensagens ou lista */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3">
                {chatSubTab === 'privado' ? (
                  <div className="space-y-1">
                    {usuariosFiltrados.map(b => (
                      <button key={b.id}
                        onClick={() => { setConversaComUser(b.nomeGuerra.toLowerCase()); setConversaComNome(b.nomeCompleto); setBusca(''); }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-card">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-aviation-500 to-aviation-700 text-xs font-bold text-white">
                          {b.foto ? <img src={b.foto} className="h-full w-full rounded-full object-cover" /> : b.nomeGuerra.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-graphite-100 truncate">{b.nomeCompleto}</p>
                          <p className="text-[11px] text-graphite-500">{b.nomeGuerra} · Equipe {b.equipe}</p>
                        </div>
                      </button>
                    ))}
                    {usuariosFiltrados.length === 0 && (
                      <p className="py-8 text-center text-xs text-graphite-600">Nenhuma pessoa encontrada.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mensagensAtuais.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="mb-3 rounded-2xl bg-surface-card p-4">
                          <MessageCircle className="h-8 w-8 text-graphite-600" />
                        </div>
                        <p className="text-sm font-medium text-graphite-400">Nenhuma mensagem</p>
                        <p className="text-xs text-graphite-600">Comece a conversa!</p>
                      </div>
                    )}
                    {mensagensAtuais.map((m, i) => {
                      const isMe = m.de === username;
                      const showDay = i === 0 || formatDay(m.createdAt) !== formatDay(mensagensAtuais[i - 1].createdAt);
                      return (
                        <div key={m.id}>
                          {showDay && (
                            <p className="mb-2 mt-1 text-center text-[10px] font-medium text-graphite-600">{formatDay(m.createdAt)}</p>
                          )}
                          <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                              isMe
                                ? 'bg-aviation-600 text-white rounded-br-md'
                                : 'bg-surface-card text-graphite-100 rounded-bl-md border border-border-dark'
                            }`}>
                              {!isMe && chatSubTab === 'geral' && (
                                <p className="mb-0.5 text-[10px] font-bold text-aviation-300">{m.deNome}</p>
                              )}
                              <p className="text-sm leading-snug">{m.texto}</p>
                              <p className={`mt-0.5 text-right text-[9px] ${isMe ? 'text-white/50' : 'text-graphite-600'}`}>
                                {formatTime(m.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ─── CONVERSA PRIVADA ─── */}
          {conversaComUser && (
            <>
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3">
                <div className="space-y-2">
                  {mensagensAtuais.length === 0 && (
                    <p className="py-8 text-center text-xs text-graphite-600">Nenhuma mensagem. Envie a primeira!</p>
                  )}
                  {mensagensAtuais.map((m, i) => {
                    const isMe = m.de === username;
                    const showDay = i === 0 || formatDay(m.createdAt) !== formatDay(mensagensAtuais[i - 1].createdAt);
                    return (
                      <div key={m.id}>
                        {showDay && (
                          <p className="mb-2 mt-1 text-center text-[10px] font-medium text-graphite-600">{formatDay(m.createdAt)}</p>
                        )}
                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                            isMe
                              ? 'bg-aviation-600 text-white rounded-br-md'
                              : 'bg-surface-card text-graphite-100 rounded-bl-md border border-border-dark'
                          }`}>
                            <p className="text-sm leading-snug">{m.texto}</p>
                            <p className={`mt-0.5 text-right text-[9px] ${isMe ? 'text-white/50' : 'text-graphite-600'}`}>
                              {formatTime(m.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Input */}
              <div className="border-t border-border-dark px-4 py-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={msg}
                    onChange={e => setMsg(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Mensagem para ${conversaComNome}...`}
                    rows={1}
                    className="min-h-[38px] max-h-24 flex-1 resize-none rounded-xl border border-border-dark bg-surface-card px-3.5 py-2.5 text-sm text-graphite-100 placeholder-graphite-600 outline-none transition-colors focus:border-aviation-500/50"
                  />
                  <button onClick={handleSend} disabled={!msg.trim()}
                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-aviation-600 text-white transition-all hover:bg-aviation-700 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ─── CONTATOS ─── */}
          {tab === 'contatos' && !conversaComUser && (
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-graphite-500" />
                <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar contato..."
                  className="w-full rounded-xl border border-border-dark bg-surface-card py-2.5 pl-9 pr-3 text-xs text-graphite-100 placeholder-graphite-600 outline-none transition-colors focus:border-aviation-500/50" />
              </div>

              <div className="space-y-1">
                {usuariosFiltrados.map(b => (
                  <button key={b.id}
                    onClick={() => { setTab('chat'); setChatSubTab('privado'); setConversaComUser(b.nomeGuerra.toLowerCase()); setConversaComNome(b.nomeCompleto); setBusca(''); }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-card">
                    <div className="relative">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-aviation-500 to-aviation-700 text-sm font-bold text-white">
                        {b.foto ? <img src={b.foto} className="h-full w-full rounded-full object-cover" /> : b.nomeGuerra.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface-dark bg-green-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-graphite-100 truncate">{b.nomeCompleto}</p>
                      <p className="text-[11px] text-graphite-500">{b.nomeGuerra} · {b.equipe} · {b.turno}</p>
                    </div>
                    <MessageCircle className="h-4 w-4 shrink-0 text-graphite-600 transition-colors group-hover:text-aviation-400" />
                  </button>
                ))}
                {usuariosFiltrados.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="mb-3 rounded-2xl bg-surface-card p-4">
                      <Users className="h-8 w-8 text-graphite-600" />
                    </div>
                    <p className="text-sm font-medium text-graphite-400">Nenhum contato</p>
                    <p className="text-xs text-graphite-600">Nenhum funcionário encontrado.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
