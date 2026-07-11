import { baseApi } from './baseApi';
import type { Ferias } from '../../types/ferias';

const STORAGE_KEY = 'sescinc-ferias';

function getAll(): Ferias[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: Ferias[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const feriasApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listarFerias: builder.query<Ferias[], void>({
      queryFn: () => ({ data: getAll() }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Ferias' as const, id })),
              { type: 'Ferias', id: 'LIST' },
            ]
          : [{ type: 'Ferias', id: 'LIST' }],
    }),
    feriasPorFuncionario: builder.query<Ferias[], string>({
      queryFn: (funcionarioId) => ({
        data: getAll().filter((f) => f.funcionarioId === funcionarioId),
      }),
    }),
    criarFerias: builder.mutation<Ferias, Omit<Ferias, 'id' | 'createdAt' | 'updatedAt'>>({
      queryFn: (data) => {
        const all = getAll();
        const now = new Date().toISOString();
        const nova: Ferias = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        all.push(nova);
        saveAll(all);
        return { data: nova };
      },
      invalidatesTags: [{ type: 'Ferias', id: 'LIST' }],
    }),
    atualizarFerias: builder.mutation<Ferias, { id: string; data: Partial<Ferias> }>({
      queryFn: ({ id, data }) => {
        const all = getAll();
        const idx = all.findIndex((f) => f.id === id);
        if (idx === -1) return { error: { message: 'Ferias not found' } };
        all[idx] = {
          ...all[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        saveAll(all);
        return { data: all[idx] };
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Ferias', id }],
    }),
    excluirFerias: builder.mutation<void, string>({
      queryFn: (id) => {
        saveAll(getAll().filter((f) => f.id !== id));
        return { data: undefined };
      },
      invalidatesTags: (_result, _error, id) => [{ type: 'Ferias', id }],
    }),
  }),
});

export const {
  useListarFeriasQuery,
  useFeriasPorFuncionarioQuery,
  useCriarFeriasMutation,
  useAtualizarFeriasMutation,
  useExcluirFeriasMutation,
} = feriasApi;
