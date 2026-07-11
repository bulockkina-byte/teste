import { baseApi } from './baseApi';
import type { LRO } from '../../types/lro';

const STORAGE_KEY = 'sescinc-lros';

function getAll(): LRO[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: LRO[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const lroApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listarLROs: builder.query<LRO[], void>({
      queryFn: () => ({ data: getAll() }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'LRO' as const, id })),
              { type: 'LRO', id: 'LIST' },
            ]
          : [{ type: 'LRO', id: 'LIST' }],
    }),
    listarLROsPorUsuario: builder.query<LRO[], string>({
      queryFn: (username) => ({
        data: getAll().filter((e) => e.createdBy === username),
      }),
    }),
    obterLRO: builder.query<LRO | undefined, string>({
      queryFn: (id) => ({ data: getAll().find((e) => e.id === id) }),
      providesTags: (_result, _error, id) => [{ type: 'LRO', id }],
    }),
    criarLRO: builder.mutation<LRO, Omit<LRO, 'id' | 'createdAt' | 'updatedAt'>>({
      queryFn: (data) => {
        const list = getAll();
        const nova: LRO = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        list.push(nova);
        saveAll(list);
        return { data: nova };
      },
      invalidatesTags: [{ type: 'LRO', id: 'LIST' }],
    }),
    atualizarLRO: builder.mutation<LRO, { id: string; data: Partial<LRO> }>({
      queryFn: ({ id, data }) => {
        const list = getAll();
        const idx = list.findIndex((e) => e.id === id);
        if (idx === -1) return { error: { message: 'LRO not found' } };
        list[idx] = {
          ...list[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        saveAll(list);
        return { data: list[idx] };
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'LRO', id }],
    }),
    excluirLRO: builder.mutation<void, string>({
      queryFn: (id) => {
        const list = getAll();
        const idx = list.findIndex((e) => e.id === id);
        if (idx === -1) return { error: { message: 'LRO not found' } };
        list.splice(idx, 1);
        saveAll(list);
        return { data: undefined };
      },
      invalidatesTags: (_result, _error, id) => [{ type: 'LRO', id }],
    }),
  }),
});

export const {
  useListarLROsQuery,
  useListarLROsPorUsuarioQuery,
  useObterLROQuery,
  useCriarLROMutation,
  useAtualizarLROMutation,
  useExcluirLROMutation,
} = lroApi;
