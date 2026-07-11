import { baseApi } from './baseApi';
import type { EscalaDiaria } from '../../types/escala';

const STORAGE_KEY = 'sescinc-escalas-diarias';

function getAll(): EscalaDiaria[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: EscalaDiaria[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const escalaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listarEscalas: builder.query<EscalaDiaria[], void>({
      queryFn: () => ({ data: getAll() }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Escala' as const, id })),
              { type: 'Escala', id: 'LIST' },
            ]
          : [{ type: 'Escala', id: 'LIST' }],
    }),
    listarEscalasPorUsuario: builder.query<EscalaDiaria[], string>({
      queryFn: (username) => ({
        data: getAll().filter((e) => e.createdBy === username),
      }),
    }),
    obterEscala: builder.query<EscalaDiaria | undefined, string>({
      queryFn: (id) => ({ data: getAll().find((e) => e.id === id) }),
      providesTags: (_result, _error, id) => [{ type: 'Escala', id }],
    }),
    criarEscala: builder.mutation<
      EscalaDiaria,
      Omit<EscalaDiaria, 'id' | 'createdAt' | 'updatedAt'>
    >({
      queryFn: (data) => {
        const list = getAll();
        const nova: EscalaDiaria = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        list.push(nova);
        saveAll(list);
        return { data: nova };
      },
      invalidatesTags: [{ type: 'Escala', id: 'LIST' }],
    }),
    atualizarEscala: builder.mutation<EscalaDiaria, { id: string; data: Partial<EscalaDiaria> }>({
      queryFn: ({ id, data }) => {
        const list = getAll();
        const idx = list.findIndex((e) => e.id === id);
        if (idx === -1) return { error: { message: 'Escala not found' } };
        list[idx] = {
          ...list[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        saveAll(list);
        return { data: list[idx] };
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Escala', id }],
    }),
    excluirEscala: builder.mutation<void, string>({
      queryFn: (id) => {
        const list = getAll();
        const idx = list.findIndex((e) => e.id === id);
        if (idx === -1) return { error: { message: 'Escala not found' } };
        list.splice(idx, 1);
        saveAll(list);
        return { data: undefined };
      },
      invalidatesTags: (_result, _error, id) => [{ type: 'Escala', id }],
    }),
  }),
});

export const {
  useListarEscalasQuery,
  useListarEscalasPorUsuarioQuery,
  useObterEscalaQuery,
  useCriarEscalaMutation,
  useAtualizarEscalaMutation,
  useExcluirEscalaMutation,
} = escalaApi;
