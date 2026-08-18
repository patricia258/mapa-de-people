alter table public.mapa_respostas
  add column if not exists diagnostico_v2 jsonb;

alter table public.mapa_respostas
  drop constraint if exists mapa_respostas_diagnostico_v2_check,
  add constraint mapa_respostas_diagnostico_v2_check check (
    diagnostico_v2 is null or (
      jsonb_typeof(diagnostico_v2) = 'object'
      and diagnostico_v2 ->> 'version' = '2'
      and jsonb_array_length(diagnostico_v2 #> '{d1,processos}') = 3
      and jsonb_array_length(diagnostico_v2 #> '{d1,estrutura}') = 2
      and jsonb_array_length(diagnostico_v2 #> '{d1,governanca}') = 2
      and jsonb_array_length(diagnostico_v2 #> '{d2,comportamento}') = 3
      and jsonb_array_length(diagnostico_v2 #> '{d2,desenvolvimento}') = 3
      and jsonb_array_length(diagnostico_v2 #> '{d3,indicadores}') = 2
      and jsonb_array_length(diagnostico_v2 #> '{d3,decisao}') = 2
      and jsonb_array_length(diagnostico_v2 #> '{d3,tecnologia}') = 2
      and jsonb_array_length(diagnostico_v2 #> '{d4,tamanho}') = 2
      and jsonb_array_length(diagnostico_v2 #> '{d4,rotatividade}') = 2
      and pg_column_size(diagnostico_v2) <= 32768
    )
  );

grant insert (diagnostico_v2) on table public.mapa_respostas to anon;

drop policy if exists "Envio publico do Mapa de People" on public.mapa_respostas;
create policy "Envio publico do Mapa de People"
on public.mapa_respostas
for insert
to anon
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
    then d4_mix_clt::integer + d4_mix_pj::integer + d4_mix_estagio::integer + d4_mix_freela::integer = 100
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

comment on column public.mapa_respostas.diagnostico_v2 is
  'Respostas profundas do questionario V2, agrupadas pelas 12 subcamadas; mantem compatibilidade com os campos legados.';
