drop policy if exists "Administradora CALI pode ler respostas" on public.mapa_respostas;
drop policy if exists "Administradora CALI pode revisar respostas" on public.mapa_respostas;

create policy "Administradora CALI pode ler respostas"
on public.mapa_respostas
for select
to authenticated
using (
  (select auth.uid()) is not null
  and lower(((select auth.jwt()) ->> 'email')) = 'patricia@calirh.com'
);

create policy "Administradora CALI pode revisar respostas"
on public.mapa_respostas
for update
to authenticated
using (
  (select auth.uid()) is not null
  and lower(((select auth.jwt()) ->> 'email')) = 'patricia@calirh.com'
)
with check (
  (select auth.uid()) is not null
  and lower(((select auth.jwt()) ->> 'email')) = 'patricia@calirh.com'
);
