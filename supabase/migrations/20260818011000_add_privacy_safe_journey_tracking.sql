create table if not exists public.mapa_eventos (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  event_type text not null check (event_type in ('visit', 'start', 'step', 'copy', 'submit')),
  step smallint not null default 0 check (step between 0 and 7),
  page_path text not null default '/' check (char_length(page_path) between 1 and 120),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 160),
  device_type text not null default 'unknown' check (device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 1024
  ),
  created_at timestamptz not null default now()
);

alter table public.mapa_eventos enable row level security;

revoke all on table public.mapa_eventos from anon, authenticated;
grant insert (session_id, event_type, step, page_path, referrer_host, device_type, metadata)
  on table public.mapa_eventos to anon;
grant select on table public.mapa_eventos to authenticated;
grant usage, select on sequence public.mapa_eventos_id_seq to anon;

drop policy if exists "public_can_append_safe_journey_events" on public.mapa_eventos;
create policy "public_can_append_safe_journey_events"
on public.mapa_eventos
for insert
to anon
with check (
  event_type in ('visit', 'start', 'step', 'copy', 'submit')
  and step between 0 and 7
  and page_path = '/'
  and device_type in ('mobile', 'tablet', 'desktop', 'unknown')
  and jsonb_typeof(metadata) = 'object'
  and pg_column_size(metadata) <= 1024
);

drop policy if exists "admin_can_read_journey_events" on public.mapa_eventos;
create policy "admin_can_read_journey_events"
on public.mapa_eventos
for select
to authenticated
using (
  lower((select auth.jwt())->>'email') = 'patricia@calirh.com'
);

create index if not exists mapa_eventos_session_created_idx
  on public.mapa_eventos (session_id, created_at desc);
create index if not exists mapa_eventos_type_created_idx
  on public.mapa_eventos (event_type, created_at desc);
create index if not exists mapa_eventos_created_idx
  on public.mapa_eventos (created_at desc);

drop view if exists public.mapa_sessoes_resumo;
create view public.mapa_sessoes_resumo
with (security_invoker = true)
as
select
  session_id,
  min(created_at) as accessed_at,
  max(created_at) as last_seen_at,
  max(step) as max_step,
  bool_or(event_type = 'start') as started,
  bool_or(event_type = 'submit') as submitted,
  count(*) filter (where event_type = 'copy')::integer as copy_events,
  max(referrer_host) filter (where referrer_host is not null) as referrer_host,
  max(device_type) as device_type
from public.mapa_eventos
group by session_id;

revoke all on table public.mapa_sessoes_resumo from anon, authenticated;
grant select on table public.mapa_sessoes_resumo to authenticated;

comment on table public.mapa_eventos is
  'Eventos mínimos da jornada do formulário; não armazena conteúdo copiado, respostas parciais, IP ou user-agent.';
