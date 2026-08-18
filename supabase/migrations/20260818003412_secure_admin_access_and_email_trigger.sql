-- Mantém o formulário público para envio, mas protege leitura e revisão.
drop policy if exists "Atualizacao via chave publica (painel interno, sem auth ainda)" on public.mapa_respostas;
drop policy if exists "Leitura via chave publica (painel interno, sem auth ainda)" on public.mapa_respostas;
drop policy if exists "Permitir insercao publica de respostas" on public.mapa_respostas;
drop policy if exists "Envio publico do Mapa de People" on public.mapa_respostas;
drop policy if exists "Administradora CALI pode ler respostas" on public.mapa_respostas;
drop policy if exists "Administradora CALI pode revisar respostas" on public.mapa_respostas;

revoke all on table public.mapa_respostas from anon;
revoke all on table public.mapa_respostas from authenticated;

grant insert (
  protocolo,
  d1_rh_hoje, d1_processos, d1_cargos_salarios,
  d2_valores, d2_lideres_preparo, d2_comportamento_dono, d2_sucessao,
  d3_indicadores, d3_decisao, d3_custo,
  d4_colaboradores, d4_unidades, d4_mix_clt, d4_mix_pj, d4_mix_estagio, d4_mix_freela, d4_turnover,
  l1_tecnologia, l2_execucao, l3_rh_interno,
  q_prazo, q_decisor, q_decisor_outro, q_formato, q_investimento, q_origem,
  c_nome, c_empresa, c_email, c_whatsapp, lgpd_aceite
) on table public.mapa_respostas to anon;

grant select on table public.mapa_respostas to authenticated;
grant update (observacoes, status, relatorio_enviado_em) on table public.mapa_respostas to authenticated;

create policy "Envio publico do Mapa de People"
on public.mapa_respostas
for insert
to anon
with check (
  lgpd_aceite is true
  and status = 'novo'
  and observacoes = '{}'::jsonb
  and relatorio_enviado_em is null
  and nullif(btrim(c_nome), '') is not null
  and nullif(btrim(c_empresa), '') is not null
  and nullif(btrim(c_email), '') is not null
  and nullif(btrim(c_whatsapp), '') is not null
);

create policy "Administradora CALI pode ler respostas"
on public.mapa_respostas
for select
to authenticated
using (
  (select auth.uid()) is not null
  and lower((select auth.jwt() ->> 'email')) = 'patricia@calirh.com'
);

create policy "Administradora CALI pode revisar respostas"
on public.mapa_respostas
for update
to authenticated
using (
  (select auth.uid()) is not null
  and lower((select auth.jwt() ->> 'email')) = 'patricia@calirh.com'
)
with check (
  (select auth.uid()) is not null
  and lower((select auth.jwt() ->> 'email')) = 'patricia@calirh.com'
);

-- O gatilho precisa de privilégios elevados apenas para chamar pg_net.
-- Ele fica fora do schema exposto e não pode ser executado por usuários da API.
drop trigger if exists trg_notificar_nova_resposta on public.mapa_respostas;
drop function if exists public.notificar_nova_resposta();

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create or replace function private.notificar_nova_resposta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform net.http_post(
    url := 'https://kqtbfeeqbcllwvlkbrkq.supabase.co/functions/v1/notificar-mapa',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxdGJmZWVxYmNsbHd2bGticmtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5OTIyODMsImV4cCI6MjEwMjU2ODI4M30.G8xr2MR_YWKWjzSk88r9ryVzCyR9QqQEWHrHNeWE7Cg'
    ),
    body := jsonb_build_object('record', row_to_json(new)),
    timeout_milliseconds := 10000
  );
  return new;
end;
$function$;

revoke all on function private.notificar_nova_resposta() from public;
revoke all on function private.notificar_nova_resposta() from anon;
revoke all on function private.notificar_nova_resposta() from authenticated;

create trigger trg_notificar_nova_resposta
after insert on public.mapa_respostas
for each row
execute function private.notificar_nova_resposta();
