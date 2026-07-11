import { baseApi } from './baseApi';
import type { EPI } from '../../types/epi';

const STORAGE_KEY = 'sescinc-epis';

function getAll(): EPI[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: EPI[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const epiApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listarEPIs: builder.query<EPI[], void>({
      queryFn: () => ({ data: getAll() }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'EPI' as const, id })),
              { type: 'EPI', id: 'LIST' },
            ]
          : [{ type: 'EPI', id: 'LIST' }],
    }),
    criarEPI: builder.mutation<EPI, Omit<EPI, 'id' | 'createdAt' | 'updatedAt'>>({
      queryFn: (data) => {
        const all = getAll();
        const now = new Date().toISOString();
        const novo: EPI = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        all.push(novo);
        saveAll(all);
        return { data: novo };
      },
      invalidatesTags: [{ type: 'EPI', id: 'LIST' }],
    }),
    atualizarEPI: builder.mutation<EPI, { id: string; data: Partial<EPI> }>({
      queryFn: ({ id, data }) => {
        const all = getAll();
        const idx = all.findIndex((e) => e.id === id);
        if (idx === -1) return { error: { message: 'EPI not found' } };
        all[idx] = {
          ...all[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        saveAll(all);
        return { data: all[idx] };
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'EPI', id }],
    }),
    excluirEPI: builder.mutation<void, string>({
      queryFn: (id) => {
        saveAll(getAll().filter((e) => e.id !== id));
        return { data: undefined };
      },
      invalidatesTags: (_result, _error, id) => [{ type: 'EPI', id }],
    }),
  }),
});

export const {
  useListarEPIsQuery,
  useCriarEPIMutation,
  useAtualizarEPIMutation,
  useExcluirEPIMutation,
} = epiApi;
