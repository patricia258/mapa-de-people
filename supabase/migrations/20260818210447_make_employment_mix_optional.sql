-- Permite que o lead pule o mix percentual de vinculos.
-- Quando informado, o total continua obrigado a somar 100%.
alter policy "Envio publico do Mapa de People"
on public.mapa_respostas
with check (
  lgpd_aceite is true
  and c_email_corporativo_confirmado is true
  and status = 'novo'
  and observacoes = '{}'::jsonb
  and relatorio_enviado_em is null
  and nullif(btrim(c_nome), '') is not null
  and nullif(btrim(c_empresa), '') is not null
  and nullif(btrim(c_cargo), '') is not null
  and nullif(btrim(c_email), '') is not null
  and c_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'
  and nullif(btrim(c_whatsapp), '') is not null
  and c_preferencia_contato in ('email', 'whatsapp', 'ambos')
  and diagnostico_v2 ->> 'version' = '2'
  and d1_rh_hoje between 1 and 5
  and d1_processos between 1 and 5
  and d1_cargos_salarios between 1 and 5
  and d2_valores between 1 and 5
  and d2_lideres_preparo between 1 and 5
  and d2_comportamento_dono between 1 and 5
  and d2_sucessao between 1 and 5
  and d3_indicadores between 1 and 5
  and d3_decisao between 1 and 5
  and d3_custo between 1 and 5
  and d4_colaboradores between 1 and 5
  and d4_unidades in (1, 3, 5)
  and d4_turnover between 1 and 5
  and case
    when d4_mix_clt ~ '^[0-9]{1,3}$'
      and d4_mix_pj ~ '^[0-9]{1,3}$'
      and d4_mix_estagio ~ '^[0-9]{1,3}$'
      and d4_mix_freela ~ '^[0-9]{1,3}$'
    then d4_mix_clt::integer + d4_mix_pj::integer + d4_mix_estagio::integer + d4_mix_freela::integer in (0, 100)
    else false
  end
  and l1_tecnologia between 1 and 5
  and l2_execucao between 1 and 5
  and l3_rh_interno between 1 and 5
  and nullif(btrim(q_prazo), '') is not null
  and cardinality(q_decisor) > 0
  and nullif(btrim(q_formato), '') is not null
  and nullif(btrim(q_investimento), '') is not null
  and nullif(btrim(q_origem), '') is not null
);
