import { baseApi } from './baseApi';
import type { PTRB } from '../../types/ptrb';

const STORAGE_KEY = 'sescinc-ptrbs';

function getAll(): PTRB[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: PTRB[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const ptrbApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listarPTRBs: builder.query<PTRB[], void>({
      queryFn: () => ({ data: getAll() }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'PTRB' as const, id })),
              { type: 'PTRB', id: 'LIST' },
            ]
          : [{ type: 'PTRB', id: 'LIST' }],
    }),
    listarPTRBsPorUsuario: builder.query<PTRB[], string>({
      queryFn: (username) => ({
        data: getAll().filter((e) => e.createdBy === username),
      }),
    }),
    obterPTRB: builder.query<PTRB | undefined, string>({
      queryFn: (id) => ({ data: getAll().find((e) => e.id === id) }),
      providesTags: (_result, _error, id) => [{ type: 'PTRB', id }],
    }),
    criarPTRB: builder.mutation<PTRB, Omit<PTRB, 'id' | 'createdAt' | 'updatedAt'>>({
      queryFn: (data) => {
        const list = getAll();
        const nova: PTRB = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        list.push(nova);
        saveAll(list);
        return { data: nova };
      },
      invalidatesTags: [{ type: 'PTRB', id: 'LIST' }],
    }),
    atualizarPTRB: builder.mutation<PTRB, { id: string; data: Partial<PTRB> }>({
      queryFn: ({ id, data }) => {
        const list = getAll();
        const idx = list.findIndex((e) => e.id === id);
        if (idx === -1) return { error: { message: 'PTRB not found' } };
        list[idx] = {
          ...list[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        saveAll(list);
        return { data: list[idx] };
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'PTRB', id }],
    }),
    excluirPTRB: builder.mutation<void, string>({
      queryFn: (id) => {
        const list = getAll();
        const idx = list.findIndex((e) => e.id === id);
        if (idx === -1) return { error: { message: 'PTRB not found' } };
        list.splice(idx, 1);
        saveAll(list);
        return { data: undefined };
      },
      invalidatesTags: (_result, _error, id) => [{ type: 'PTRB', id }],
    }),
  }),
});

export const {
  useListarPTRBsQuery,
  useListarPTRBsPorUsuarioQuery,
  useObterPTRBQuery,
  useCriarPTRBMutation,
  useAtualizarPTRBMutation,
  useExcluirPTRBMutation,
} = ptrbApi;
