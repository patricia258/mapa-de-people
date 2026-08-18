# Mapa de People — CALI

Diagnóstico gratuito de maturidade em gestão de pessoas, usado como isca de captação de leads pela CALI (HR for Business).

## Arquivos

- `index.html` — questionário público que o cliente preenche (wizard multi-etapas, com boas-vindas e página de obrigado embutidas). Grava as respostas direto no Supabase (tabela `mapa_respostas`).
- `login.html` — acesso administrativo exclusivo de `patricia@calirh.com`, com criação do primeiro acesso e recuperação de senha.
- `auth.js` — cliente de autenticação compartilhado pelo login, painel e relatório.
- `painel.html` — painel interno da Patrícia. Lista as respostas recebidas, mostra cada uma com os scores calculados, permite escrever observações por dimensão + parecer final + serviço recomendado, e gera o link do relatório.
- `relatorio.html` — relatório final que o cliente recebe. Não tem dados fixos: lê a resposta pelo parâmetro `?id=` na URL, busca no Supabase e monta a matriz de quadrantes, o radar e o texto na hora.
- `logo.png` — logo da CALI, fundo transparente, usada nos três arquivos acima.

## Fluxo completo

1. Cliente preenche `index.html` → grava uma linha em `mapa_respostas` no Supabase e recebe a confirmação por e-mail.
2. Patrícia recebe por e-mail o formulário completo e abre `painel.html`. O painel exige login e aceita somente `patricia@calirh.com`.
3. No painel, Patrícia abre uma resposta, escreve as observações por dimensão e o parecer final, escolhe o serviço recomendado e salva.
4. Patrícia clica em "Ver relatório" → abre `relatorio.html?id=...` numa aba nova autenticada, já com tudo preenchido.
5. Ela confere, aperta "Imprimir / Salvar PDF" no relatório (sai em A4), e envia esse PDF pro cliente por e-mail e/ou WhatsApp.

## Acesso e segurança

- O formulário público tem somente permissão de inserir uma nova resposta.
- A leitura e a revisão das respostas exigem login e são liberadas apenas para `patricia@calirh.com`.
- O relatório também exige a mesma sessão autenticada.
- A função que notifica por e-mail fica em schema privado e não pode ser chamada diretamente pelas chaves públicas.
- O envio final do PDF continua manual, depois da leitura pessoal da Patrícia.

## Primeiro acesso

1. Abra `https://mapa.calirh.com/login.html`.
2. Clique em **Primeiro acesso** e defina uma senha de pelo menos 8 caracteres.
3. Confirme o cadastro no e-mail recebido.
4. Para trocar uma senha esquecida, use **Esqueci minha senha** na mesma página.

No Supabase Auth, configure a Site URL como `https://mapa.calirh.com` e permita o redirect `https://mapa.calirh.com/login.html*`.

## Banco de dados (Supabase)

- Projeto: **CALI MAPA** (`kqtbfeeqbcllwvlkbrkq`)
- Tabela: `public.mapa_respostas` — uma linha por resposta do formulário, com todas as perguntas, a coluna `observacoes` (jsonb, preenchida no painel) e `status` (`novo` / `em_revisao` / `enviado`).

## Deploy

Site estático — sem build, sem dependências além das fontes do Google Fonts já referenciadas nos próprios arquivos HTML. Framework preset na Vercel: "Other". Projeto Vercel: `mapa-de-people` no time `cali11`, domínio `mapa.calirh.com`.

## Marca

CALI — HR for Business · calirh.com · patricia@calirh.com
