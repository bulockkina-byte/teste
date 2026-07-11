import { baseApi } from './baseApi';
import type { CertificacaoNR } from '../../types/certificacao';

const STORAGE_KEY = 'sescinc-certificacoes';

function getAll(): CertificacaoNR[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: CertificacaoNR[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const certificacaoApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listarCertificacoes: builder.query<CertificacaoNR[], void>({
      queryFn: () => ({ data: getAll() }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Certificacao' as const, id })),
              { type: 'Certificacao', id: 'LIST' },
            ]
          : [{ type: 'Certificacao', id: 'LIST' }],
    }),
    certificacoesPorFuncionario: builder.query<CertificacaoNR[], string>({
      queryFn: (funcionarioId) => ({
        data: getAll().filter((c) => c.funcionarioId === funcionarioId),
      }),
    }),
    criarCertificacao: builder.mutation<
      CertificacaoNR,
      Omit<CertificacaoNR, 'id' | 'createdAt' | 'updatedAt'>
    >({
      queryFn: (data) => {
        const all = getAll();
        const now = new Date().toISOString();
        const nova: CertificacaoNR = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        all.push(nova);
        saveAll(all);
        return { data: nova };
      },
      invalidatesTags: [{ type: 'Certificacao', id: 'LIST' }],
    }),
    atualizarCertificacao: builder.mutation<
      CertificacaoNR,
      { id: string; data: Partial<CertificacaoNR> }
    >({
      queryFn: ({ id, data }) => {
        const all = getAll();
        const idx = all.findIndex((c) => c.id === id);
        if (idx === -1) return { error: { message: 'Certificacao not found' } };
        all[idx] = {
          ...all[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        saveAll(all);
        return { data: all[idx] };
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Certificacao', id }],
    }),
    excluirCertificacao: builder.mutation<void, string>({
      queryFn: (id) => {
        saveAll(getAll().filter((c) => c.id !== id));
        return { data: undefined };
      },
      invalidatesTags: (_result, _error, id) => [{ type: 'Certificacao', id }],
    }),
  }),
});

export const {
  useListarCertificacoesQuery,
  useCertificacoesPorFuncionarioQuery,
  useCriarCertificacaoMutation,
  useAtualizarCertificacaoMutation,
  useExcluirCertificacaoMutation,
} = certificacaoApi;
