import { baseApi } from './baseApi';
import type { Ocorrencia } from '../../types/ocorrencia';

const DEFAULT_STORAGE_KEY = 'sescinc-ocorrencias';

function getByKey(key: string): Ocorrencia[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function saveByKey(key: string, list: Ocorrencia[]): void {
  localStorage.setItem(key, JSON.stringify(list));
}

export const ocorrenciaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listarOcorrencias: builder.query<Ocorrencia[], string | void>({
      queryFn: (storageKey) => ({
        data: getByKey(storageKey || DEFAULT_STORAGE_KEY),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Ocorrencia' as const, id })),
              { type: 'Ocorrencia', id: 'LIST' },
            ]
          : [{ type: 'Ocorrencia', id: 'LIST' }],
    }),
    criarOcorrencia: builder.mutation<
      Ocorrencia,
      { data: Omit<Ocorrencia, 'id' | 'createdAt' | 'updatedAt'>; storageKey?: string }
    >({
      queryFn: ({ data, storageKey }) => {
        const key = storageKey || DEFAULT_STORAGE_KEY;
        const all = getByKey(key);
        const now = new Date().toISOString();
        const nova: Ocorrencia = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        all.push(nova);
        saveByKey(key, all);
        return { data: nova };
      },
      invalidatesTags: [{ type: 'Ocorrencia', id: 'LIST' }],
    }),
    atualizarOcorrencia: builder.mutation<
      Ocorrencia,
      { id: string; data: Partial<Ocorrencia>; storageKey?: string }
    >({
      queryFn: ({ id, data, storageKey }) => {
        const key = storageKey || DEFAULT_STORAGE_KEY;
        const all = getByKey(key);
        const idx = all.findIndex((e) => e.id === id);
        if (idx === -1) return { error: { message: 'Ocorrencia not found' } };
        all[idx] = {
          ...all[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        saveByKey(key, all);
        return { data: all[idx] };
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Ocorrencia', id }],
    }),
    excluirOcorrencia: builder.mutation<void, { id: string; storageKey?: string }>({
      queryFn: ({ id, storageKey }) => {
        const key = storageKey || DEFAULT_STORAGE_KEY;
        saveByKey(key, getByKey(key).filter((e) => e.id !== id));
        return { data: undefined };
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Ocorrencia', id }],
    }),
  }),
});

export const {
  useListarOcorrenciasQuery,
  useCriarOcorrenciaMutation,
  useAtualizarOcorrenciaMutation,
  useExcluirOcorrenciaMutation,
} = ocorrenciaApi;
