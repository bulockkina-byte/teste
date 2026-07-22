-- Integridade operacional para ferias, substituicoes e escalas.
-- Estes indices protegem contra duplo clique e registros duplicados nos fluxos
-- que alimentam escala diaria, escala anual e documentos.

CREATE UNIQUE INDEX IF NOT EXISTS ux_ferias_escala_equipe_ano
ON public.ferias_escala (equipe, ano);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ferias_escala_item_periodo
ON public.ferias_escala_item (escala_id, funcionario_id, periodo_numero)
WHERE periodo_numero > 0 AND rejeitado IS NOT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ferias_gozo_funcionario_periodo
ON public.ferias (funcionario_id, periodo_numero)
WHERE periodo_numero > 0;

CREATE UNIQUE INDEX IF NOT EXISTS ux_escalas_diarias_equipe_data
ON public.escalas_diarias (equipe, data_plantao);

CREATE UNIQUE INDEX IF NOT EXISTS ux_substituicoes_temporarias_periodo
ON public.substituicoes_temporarias (
  funcionario_id,
  substituto_id,
  data_inicio,
  data_fim,
  tipo
)
WHERE status IN ('Pendente', 'Aprovada');
