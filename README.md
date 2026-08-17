# Mapa de People — CALI

Diagnóstico gratuito de maturidade em gestão de pessoas, usado como isca de captação de leads pela CALI (HR for Business).

## Arquivos

- `index.html` — questionário público que o cliente preenche (wizard multi-etapas, com boas-vindas e página de obrigado embutidas). Grava as respostas direto no Supabase (tabela `mapa_respostas`).
- `painel.html` — painel interno da Patrícia. Lista as respostas recebidas, mostra cada uma com os scores calculados, permite escrever observações por dimensão + parecer final + serviço recomendado, e gera o link do relatório.
- `relatorio.html` — relatório final que o cliente recebe. Não tem dados fixos: lê a resposta pelo parâmetro `?id=` na URL, busca no Supabase e monta a matriz de quadrantes, o radar e o texto na hora.
- `logo.png` — logo da CALI, fundo transparente, usada nos três arquivos acima.

## Fluxo completo

1. Cliente preenche `index.html` → grava uma linha em `mapa_respostas` no Supabase.
2. Patrícia abre `painel.html`, vê a lista, abre uma resposta, escreve as observações por dimensão e o parecer final, escolhe o serviço recomendado, salva.
3. Patrícia clica em "Ver relatório" → abre `relatorio.html?id=...` numa aba nova, já com tudo preenchido.
4. Ela confere, aperta "Imprimir / Salvar PDF" no relatório (sai em A4), e envia esse PDF pro cliente por e-mail e/ou WhatsApp.

## Pendências conhecidas

1. **Notificação por e-mail.** Falta ligar um gatilho (Supabase Database Webhook) que dispara ao entrar uma resposta nova, chamando uma Edge Function que usa a API do Resend pra avisar patricia@calirh.com. Falta a chave da API do Resend — a Patrícia vai gerar e enviar.
2. **Segurança do painel.** Hoje `painel.html` usa a mesma chave pública (anon) do formulário — não tem login. Qualquer pessoa com o link do painel consegue ver as respostas de todos os leads (nome, e-mail, WhatsApp). Enquanto não houver poucos leads e o link não circular, o risco é baixo, mas o ideal é adicionar Supabase Auth (login só da Patrícia) antes de divulgar o painel ou crescer o volume de leads.
3. **Envio automático ao cliente.** Hoje o envio final (e-mail/WhatsApp com o relatório) é manual, feito pela Patrícia depois de revisar. Não há disparo automático — é proposital, é o toque pessoal que ela queria manter.

## Banco de dados (Supabase)

- Projeto: **CALI MAPA** (`kqtbfeeqbcllwvlkbrkq`)
- Tabela: `public.mapa_respostas` — uma linha por resposta do formulário, com todas as perguntas, a coluna `observacoes` (jsonb, preenchida no painel) e `status` (`novo` / `em_revisao` / `enviado`).

## Deploy

Site estático — sem build, sem dependências além das fontes do Google Fonts já referenciadas nos próprios arquivos HTML. Framework preset na Vercel: "Other". Projeto Vercel: `mapa-de-people` no time `cali11`, domínio `mapa.calirh.com`.

## Marca

CALI — HR for Business · calirh.com · patricia@calirh.com
