import { baseApi } from './baseApi';
import type { Bombeiro } from '../../types/bombeiro';

const STORAGE_KEY = 'sescinc-bombeiros';

function getAll(): Bombeiro[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: Bombeiro[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const bombeiroApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listarBombeiros: builder.query<Bombeiro[], void>({
      queryFn: () => ({ data: getAll() }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Bombeiro' as const, id })),
              { type: 'Bombeiro', id: 'LIST' },
            ]
          : [{ type: 'Bombeiro', id: 'LIST' }],
    }),
    buscarBombeiros: builder.query<Bombeiro[], string>({
      queryFn: (termo) => {
        const t = termo.toLowerCase();
        const data = getAll().filter(
          (b) =>
            b.matricula.toLowerCase().includes(t) ||
            b.nomeCompleto.toLowerCase().includes(t) ||
            b.nomeGuerra.toLowerCase().includes(t) ||
            b.cpf.includes(t) ||
            b.equipe.toLowerCase().includes(t),
        );
        return { data };
      },
    }),
    obterBombeiro: builder.query<Bombeiro | undefined, string>({
      queryFn: (id) => ({ data: getAll().find((b) => b.id === id) }),
      providesTags: (_result, _error, id) => [{ type: 'Bombeiro', id }],
    }),
    listarBombeirosAtivos: builder.query<Bombeiro[], void>({
      queryFn: () => ({ data: getAll().filter((b) => !b.dataDesligamento) }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Bombeiro' as const, id })),
              { type: 'Bombeiro', id: 'LIST' },
            ]
          : [{ type: 'Bombeiro', id: 'LIST' }],
    }),
    criarBombeiro: builder.mutation<Bombeiro, Omit<Bombeiro, 'id' | 'createdAt' | 'updatedAt'>>({
      queryFn: (data) => {
        const list = getAll();
        const novo: Bombeiro = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        list.push(novo);
        saveAll(list);
        return { data: novo };
      },
      invalidatesTags: [{ type: 'Bombeiro', id: 'LIST' }],
    }),
    atualizarBombeiro: builder.mutation<Bombeiro, { id: string; data: Partial<Bombeiro> }>({
      queryFn: ({ id, data }) => {
        const list = getAll();
        const idx = list.findIndex((b) => b.id === id);
        if (idx === -1) return { error: { message: 'Bombeiro not found' } };
        list[idx] = {
          ...list[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        saveAll(list);
        return { data: list[idx] };
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Bombeiro', id }],
    }),
    excluirBombeiro: builder.mutation<void, string>({
      queryFn: (id) => {
        const list = getAll();
        const idx = list.findIndex((b) => b.id === id);
        if (idx === -1) return { error: { message: 'Bombeiro not found' } };
        list.splice(idx, 1);
        saveAll(list);
        return { data: undefined };
      },
      invalidatesTags: (_result, _error, id) => [{ type: 'Bombeiro', id }],
    }),
  }),
});

export const {
  useListarBombeirosQuery,
  useBuscarBombeirosQuery,
  useObterBombeiroQuery,
  useListarBombeirosAtivosQuery,
  useCriarBombeiroMutation,
  useAtualizarBombeiroMutation,
  useExcluirBombeiroMutation,
} = bombeiroApi;
