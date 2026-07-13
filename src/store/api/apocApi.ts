import { baseApi } from './baseApi';
import type { APOC } from '../../types/apoc';

const STORAGE_KEY = 'sescinc-apoc';

function getAll(): APOC[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: APOC[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const apocApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listarAPOCs: builder.query<APOC[], void>({
      queryFn: () => ({ data: getAll() }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'APOC' as const, id })),
              { type: 'APOC', id: 'LIST' },
            ]
          : [{ type: 'APOC', id: 'LIST' }],
    }),
    buscarAPOCs: builder.query<APOC[], string>({
      queryFn: (termo) => {
        const t = termo.toLowerCase();
        const data = getAll().filter(
          (a) =>
            a.nomeCompleto.toLowerCase().includes(t) ||
            a.nomeGuerra.toLowerCase().includes(t) ||
            a.email.toLowerCase().includes(t),
        );
        return { data };
      },
    }),
    criarAPOC: builder.mutation<APOC, Omit<APOC, 'id' | 'createdAt' | 'updatedAt' | 'funcao'>>({
      queryFn: (data) => {
        const list = getAll();
        const novo: APOC = {
          ...data,
          funcao: 'MOTIVA' as import('../../types/apoc').FuncaoAPOC,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        list.push(novo);
        saveAll(list);
        return { data: novo };
      },
      invalidatesTags: [{ type: 'APOC', id: 'LIST' }],
    }),
    atualizarAPOC: builder.mutation<APOC, { id: string; data: Partial<APOC> }>({
      queryFn: ({ id, data }) => {
        const list = getAll();
        const idx = list.findIndex((a) => a.id === id);
        if (idx === -1) return { error: { message: 'APOC not found' } };
        list[idx] = {
          ...list[idx],
          ...data,
          funcao: 'MOTIVA' as import('../../types/apoc').FuncaoAPOC,
          updatedAt: new Date().toISOString(),
        };
        saveAll(list);
        return { data: list[idx] };
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'APOC', id }],
    }),
    excluirAPOC: builder.mutation<void, string>({
      queryFn: (id) => {
        const list = getAll();
        const idx = list.findIndex((a) => a.id === id);
        if (idx === -1) return { error: { message: 'APOC not found' } };
        list.splice(idx, 1);
        saveAll(list);
        return { data: undefined };
      },
      invalidatesTags: (_result, _error, id) => [{ type: 'APOC', id }],
    }),
  }),
});

export const {
  useListarAPOCsQuery,
  useBuscarAPOCsQuery,
  useCriarAPOCMutation,
  useAtualizarAPOCMutation,
  useExcluirAPOCMutation,
} = apocApi;
