import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery(),
  tagTypes: [
    'APOC',
    'Bombeiro',
    'Certificacao',
    'EPI',
    'Escala',
    'Ferias',
    'LRO',
    'Ocorrencia',
    'PTRB',
    'Viatura',
    'Chat',
  ],
  endpoints: () => ({}),
});
