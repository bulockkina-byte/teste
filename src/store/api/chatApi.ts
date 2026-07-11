import { baseApi } from './baseApi';
import type { ChatMensagem } from '../../types/chat';

const STORAGE_KEY = 'sescinc-chat';

function getAll(): ChatMensagem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: ChatMensagem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listarMensagens: builder.query<ChatMensagem[], void>({
      queryFn: () => ({ data: getAll() }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Chat' as const, id })),
              { type: 'Chat', id: 'LIST' },
            ]
          : [{ type: 'Chat', id: 'LIST' }],
    }),
    mensagensGerais: builder.query<ChatMensagem[], void>({
      queryFn: () => ({
        data: getAll().filter((m) => m.para === null),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Chat' as const, id })),
              { type: 'Chat', id: 'LIST' },
            ]
          : [{ type: 'Chat', id: 'LIST' }],
    }),
    mensagensPrivadas: builder.query<ChatMensagem[], string>({
      queryFn: (usuario) => ({
        data: getAll().filter((m) => m.para === usuario || m.de === usuario),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Chat' as const, id })),
              { type: 'Chat', id: 'LIST' },
            ]
          : [{ type: 'Chat', id: 'LIST' }],
    }),
    conversaCom: builder.query<ChatMensagem[], { usuario1: string; usuario2: string }>({
      queryFn: ({ usuario1, usuario2 }) => ({
        data: getAll()
          .filter(
            (m) =>
              (m.de === usuario1 && m.para === usuario2) ||
              (m.de === usuario2 && m.para === usuario1),
          )
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      }),
    }),
    contarNaoLidas: builder.query<number, string>({
      queryFn: (usuario) => ({
        data: getAll().filter((m) => m.para === usuario && !m.lida).length,
      }),
    }),
    enviarMensagem: builder.mutation<
      ChatMensagem,
      Omit<ChatMensagem, 'id' | 'createdAt' | 'lida'>
    >({
      queryFn: (data) => {
        const all = getAll();
        const msg: ChatMensagem = {
          ...data,
          id: crypto.randomUUID(),
          lida: false,
          createdAt: new Date().toISOString(),
        };
        all.push(msg);
        saveAll(all);
        return { data: msg };
      },
      invalidatesTags: [{ type: 'Chat', id: 'LIST' }],
    }),
    marcarLida: builder.mutation<void, string>({
      queryFn: (id) => {
        const all = getAll();
        const idx = all.findIndex((m) => m.id === id);
        if (idx !== -1) {
          all[idx].lida = true;
          saveAll(all);
        }
        return { data: undefined };
      },
      invalidatesTags: (_result, _error, id) => [{ type: 'Chat', id }],
    }),
  }),
});

export const {
  useListarMensagensQuery,
  useMensagensGeraisQuery,
  useMensagensPrivadasQuery,
  useConversaComQuery,
  useContarNaoLidasQuery,
  useEnviarMensagemMutation,
  useMarcarLidaMutation,
} = chatApi;
