import { baseApi } from './baseApi';
import type { Viatura } from '../../types/viatura';

const STORAGE_KEY = 'sescinc-viaturas';

function getAll(): Viatura[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: Viatura[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const viaturaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listarViaturas: builder.query<Viatura[], void>({
      queryFn: () => ({ data: getAll() }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Viatura' as const, id })),
              { type: 'Viatura', id: 'LIST' },
            ]
          : [{ type: 'Viatura', id: 'LIST' }],
    }),
    buscarViaturas: builder.query<Viatura[], string>({
      queryFn: (termo) => {
        const t = termo.toLowerCase();
        const data = getAll().filter(
          (v) =>
            v.prefixo.toLowerCase().includes(t) ||
            v.placa.toLowerCase().includes(t) ||
            v.marca.toLowerCase().includes(t) ||
            v.modelo.toLowerCase().includes(t) ||
            v.equipe.toLowerCase().includes(t),
        );
        return { data };
      },
    }),
    criarViatura: builder.mutation<Viatura, Omit<Viatura, 'id' | 'createdAt' | 'updatedAt'>>({
      queryFn: (data) => {
        const list = getAll();
        const novo: Viatura = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        list.push(novo);
        saveAll(list);
        return { data: novo };
      },
      invalidatesTags: [{ type: 'Viatura', id: 'LIST' }],
    }),
    atualizarViatura: builder.mutation<Viatura, { id: string; data: Partial<Viatura> }>({
      queryFn: ({ id, data }) => {
        const list = getAll();
        const idx = list.findIndex((v) => v.id === id);
        if (idx === -1) return { error: { message: 'Viatura not found' } };
        list[idx] = {
          ...list[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        saveAll(list);
        return { data: list[idx] };
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Viatura', id }],
    }),
    excluirViatura: builder.mutation<void, string>({
      queryFn: (id) => {
        const list = getAll();
        const idx = list.findIndex((v) => v.id === id);
        if (idx === -1) return { error: { message: 'Viatura not found' } };
        list.splice(idx, 1);
        saveAll(list);
        return { data: undefined };
      },
      invalidatesTags: (_result, _error, id) => [{ type: 'Viatura', id }],
    }),
  }),
});

export const {
  useListarViaturasQuery,
  useBuscarViaturasQuery,
  useCriarViaturaMutation,
  useAtualizarViaturaMutation,
  useExcluirViaturaMutation,
} = viaturaApi;
