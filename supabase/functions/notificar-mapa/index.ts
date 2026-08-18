import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "CALI — Mapa de People <mapa@calirh.com>";
const LOGO_URL = "https://mapa.calirh.com/logo.png";
const PAINEL_URL = "https://mapa.calirh.com/painel.html";
const PRAZO_RETORNO = "em até 3 dias úteis";

const BORDO = "#5A1E2D";
const MARFIM = "#F7F3EE";
const DOURADO = "#B58C52";
const GRAFITE = "#2B2B2B";
const TAUPE = "#B7A99A";

function escapeHtml(value: unknown) {
  return String(value ?? "—")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function scale(value: unknown) {
  const labels: Record<string, string> = {
    "1": "1 · Muito baixo",
    "2": "2 · Baixo",
    "3": "3 · Médio",
    "4": "4 · Alto",
    "5": "5 · Muito alto",
  };
  return labels[String(value)] ?? "—";
}

function answerRow(label: string, value: unknown) {
  return `<tr>
    <td class="answer-label" bgcolor="#FFFFFF" style="padding:8px 10px;border-bottom:1px solid #EFE8DF;background-color:#FFFFFF;background-image:linear-gradient(#FFFFFF,#FFFFFF);color:${TAUPE};-webkit-text-fill-color:${TAUPE};font-size:12px;width:48%;vertical-align:top;">${escapeHtml(label)}</td>
    <td class="answer-value" bgcolor="#FFFFFF" style="padding:8px 10px;border-bottom:1px solid #EFE8DF;background-color:#FFFFFF;background-image:linear-gradient(#FFFFFF,#FFFFFF);color:${GRAFITE};-webkit-text-fill-color:${GRAFITE};font-size:12px;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
  </tr>`;
}

function section(title: string, rows: string) {
  return `<div style="margin:24px 0 0;">
    <div style="font-family:Georgia,serif;color:${BORDO};font-size:16px;font-weight:bold;margin-bottom:8px;">${escapeHtml(title)}</div>
    <table class="answer-table" bgcolor="#FFFFFF" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#FFFFFF;background-image:linear-gradient(#FFFFFF,#FFFFFF);border:1px solid #EFE8DF;border-radius:8px;overflow:hidden;border-collapse:separate;border-spacing:0;">${rows}</table>
  </div>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });

  const body = await response.text();
  if (!response.ok) throw new Error(`Resend ${response.status}: ${body}`);
  return { ok: true, status: response.status, body };
}

function emailBaseWrap(innerHtml: string, preheader: string) {
  return `<!doctype html><html><head>
  <meta charset="utf-8">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <style>
    :root{color-scheme:light only!important;supported-color-schemes:light only!important}
    body,.email-bg{background-color:${MARFIM}!important;background-image:linear-gradient(${MARFIM},${MARFIM})!important}
    .email-card,.email-content,.answer-table,.answer-label,.answer-value{background-color:#FFFFFF!important;background-image:linear-gradient(#FFFFFF,#FFFFFF)!important}
    .email-header{background-color:${BORDO}!important;background-image:linear-gradient(${BORDO},${BORDO})!important}
    .email-footer{background-color:${MARFIM}!important;background-image:linear-gradient(${MARFIM},${MARFIM})!important}
    @media (prefers-color-scheme:dark){
      body,.email-bg{background-color:${MARFIM}!important;background-image:linear-gradient(${MARFIM},${MARFIM})!important}
      .email-card,.email-content,.answer-table,.answer-label,.answer-value{background-color:#FFFFFF!important;background-image:linear-gradient(#FFFFFF,#FFFFFF)!important}
      .email-header{background-color:${BORDO}!important;background-image:linear-gradient(${BORDO},${BORDO})!important}
      .email-content{color:${GRAFITE}!important}
      .email-footer{background-color:${MARFIM}!important;background-image:linear-gradient(${MARFIM},${MARFIM})!important;color:${TAUPE}!important;-webkit-text-fill-color:${TAUPE}!important}
    }
  </style>
  </head><body class="email-body" bgcolor="${MARFIM}" style="margin:0;background-color:${MARFIM};background-image:linear-gradient(${MARFIM},${MARFIM});color-scheme:light only;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <div class="email-bg" style="background-color:${MARFIM};background-image:linear-gradient(${MARFIM},${MARFIM});padding:34px 16px;font-family:Arial,Helvetica,sans-serif;">
    <table class="email-card" bgcolor="#FFFFFF" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#FFFFFF;background-image:linear-gradient(#FFFFFF,#FFFFFF);border-radius:14px;overflow:hidden;border:1px solid #EFE8DF;box-shadow:0 12px 34px rgba(62,21,32,.08);">
      <tr><td class="email-header" bgcolor="${BORDO}" style="background-color:${BORDO};background-image:linear-gradient(${BORDO},${BORDO});padding:34px 30px;text-align:center;"><img src="${LOGO_URL}" alt="CALI" width="170" style="display:block;margin:0 auto;max-width:100%;height:auto;"/></td></tr>
      <tr><td class="email-content" bgcolor="#FFFFFF" style="padding:36px 32px;background-color:#FFFFFF;background-image:linear-gradient(#FFFFFF,#FFFFFF);color:${GRAFITE};font-size:14px;line-height:1.7;">${innerHtml}</td></tr>
      <tr><td class="email-footer" bgcolor="${MARFIM}" style="background-color:${MARFIM};background-image:linear-gradient(${MARFIM},${MARFIM});padding:20px 30px;text-align:center;font-size:11px;color:${TAUPE};-webkit-text-fill-color:${TAUPE};letter-spacing:.03em;">CALI — HR for Business · calirh.com · patricia@calirh.com</td></tr>
    </table>
  </div></body></html>`;
}

function emailCliente(r: Record<string, unknown>) {
  const nome = String(r.c_nome ?? "").trim();
  const primeiroNome = nome.split(" ")[0] || "";
  return emailBaseWrap(`
    <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${DOURADO};font-weight:bold;margin-bottom:12px;">Mapa de People recebido</div>
    <p style="font-family:Georgia,serif;font-style:italic;font-size:22px;color:${BORDO};margin:0 0 18px;">Oi${primeiroNome ? ", " + escapeHtml(primeiroNome) : ""}.</p>
    <p style="margin:0 0 16px;">Recebi as respostas do Mapa de People da <b>${escapeHtml(r.c_empresa)}</b>. Agradeço pela confiança em compartilhar esse momento da empresa comigo.</p>
    <div style="background:${MARFIM};border-left:3px solid ${DOURADO};padding:16px 18px;margin:22px 0;border-radius:0 8px 8px 0;">
      <div style="font-size:11px;color:${TAUPE};text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Protocolo</div>
      <div style="font-family:Georgia,serif;color:${BORDO};font-size:18px;font-weight:bold;">${escapeHtml(r.protocolo)}</div>
    </div>
    <p style="margin:0 0 16px;">Agora eu vou ler cada resposta pessoalmente, cruzar as quatro dimensões e preparar a devolutiva. Você receberá meu retorno <b>${PRAZO_RETORNO}</b>, por e-mail e/ou WhatsApp.</p>
    <p style="margin:26px 0 0;">Até breve,<br/><span style="font-family:Georgia,serif;font-style:italic;color:${BORDO};font-size:17px;">Patrícia Lima</span><br/><span style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${TAUPE};">People Advisory Executive · CALI</span></p>
  `, `Recebemos o Mapa de People da ${String(r.c_empresa ?? "sua empresa")}.`);
}

function emailPatricia(r: Record<string, any>) {
  const decisores = [...(Array.isArray(r.q_decisor) ? r.q_decisor : []), r.q_decisor_outro].filter(Boolean).join(", ") || "—";
  const preferencias: Record<string, string> = { email: "E-mail", whatsapp: "WhatsApp", ambos: "E-mail ou WhatsApp" };
  const mix = `CLT ${r.d4_mix_clt ?? "–"}% · PJ ${r.d4_mix_pj ?? "–"}% · Estágio ${r.d4_mix_estagio ?? "–"}% · Terceiros ${r.d4_mix_freela ?? "–"}%`;
  const units: Record<string, string> = { "1": "Unidade única", "3": "2–3 unidades", "5": "Mais de 3 unidades" };
  const employees: Record<string, string> = { "1": "Até 20", "2": "21–50", "3": "51–150", "4": "151–500", "5": "Acima de 500" };
  const v2 = r.diagnostico_v2?.version === 2 ? r.diagnostico_v2 : null;
  const lista = (value: unknown) => Array.isArray(value) && value.length ? value.join(", ") : "—";

  const contact = section("Contato e qualificação",
    answerRow("Nome", r.c_nome) + answerRow("Cargo ou função", r.c_cargo) + answerRow("Empresa", r.c_empresa) +
    answerRow("E-mail profissional", r.c_email) + answerRow("E-mail confirmado", r.c_email_corporativo_confirmado ? "Sim" : "Não") +
    answerRow("WhatsApp", r.c_whatsapp) + answerRow("Preferência de contato", preferencias[String(r.c_preferencia_contato)] || "—") +
    answerRow("LinkedIn ou site", r.c_linkedin_site) + answerRow("Prazo", r.q_prazo) + answerRow("Pessoas decisoras", decisores) +
    answerRow("Formato", r.q_formato) + answerRow("Apoio posterior", v2?.qualificacao?.apoio_pos) +
    answerRow("Apoio jurídico", v2?.qualificacao?.juridico) + answerRow("Possíveis sócios(as) / partners", v2?.qualificacao?.candidatos_socio) +
    answerRow("Investimento", r.q_investimento) + answerRow("Origem", r.q_origem));

  const d1 = v2 ? section("01 · Maturidade Estrutural",
    answerRow("1.1 · Cargos e atribuições", scale(v2.d1.processos[0])) +
    answerRow("1.1 · Fluxos de admissão, promoção e saída", scale(v2.d1.processos[1])) +
    answerRow("1.1 · Políticas aplicadas", scale(v2.d1.processos[2])) +
    answerRow("1.2 · Hierarquia clara", scale(v2.d1.estrutura[0])) +
    answerRow("1.2 · Proporção do time de gente", scale(v2.d1.estrutura[1])) +
    answerRow("1.3 · Regras de decisão", scale(v2.d1.governanca[0])) +
    answerRow("1.3 · Registro e controle", scale(v2.d1.governanca[1]))) : section("01 · Maturidade Estrutural",
    answerRow("Como descreve o RH hoje", scale(r.d1_rh_hoje)) + answerRow("Processos formalizados", scale(r.d1_processos)) + answerRow("Cargos e salários", scale(r.d1_cargos_salarios)));

  const d2 = v2 ? section("02 · Liderança e Cultura",
    answerRow("2.1 · Iniciativa de dono", scale(v2.d2.comportamento[0])) +
    answerRow("2.1 · Responsabilidade por resultado", scale(v2.d2.comportamento[1])) +
    answerRow("2.1 · Postura com o negócio", scale(v2.d2.comportamento[2])) +
    answerRow("2.2 · Valores informados", lista(v2.d2.valores.lista)) +
    answerRow("2.2 · Valores vividos", lista(v2.d2.valores.vividos)) +
    answerRow("2.2 · Valor a desenvolver", v2.d2.valores.desenvolver) +
    answerRow("2.2 · Cultura orienta decisão", scale(v2.d2.valores.cultura_decisao)) +
    answerRow("2.3 · Pipeline de sucessão", scale(v2.d2.desenvolvimento[0])) +
    answerRow("2.3 · Programa de liderança", scale(v2.d2.desenvolvimento[1])) +
    answerRow("2.3 · Preparo para responsabilidades maiores", scale(v2.d2.desenvolvimento[2]))) : section("02 · Liderança e Cultura",
    answerRow("Valores praticados", scale(r.d2_valores)) + answerRow("Preparo das lideranças", scale(r.d2_lideres_preparo)) + answerRow("Senso de responsabilidade", scale(r.d2_comportamento_dono)) + answerRow("Plano de sucessão", scale(r.d2_sucessao)));

  const d3 = v2 ? section("03 · Dados e Decisão",
    answerRow("3.1 · Indicadores existem", scale(v2.d3.indicadores[0])) +
    answerRow("3.1 · Revisão periódica", scale(v2.d3.indicadores[1])) +
    answerRow("3.2 · Decisões de gente", scale(v2.d3.decisao[0])) +
    answerRow("3.2 · Referência compartilhada", scale(v2.d3.decisao[1])) +
    answerRow("3.3 · Ferramentas de RH", scale(v2.d3.tecnologia[0])) +
    answerRow("3.3 · Uso de IA no RH", scale(v2.d3.tecnologia[1]))) : section("03 · Dados e Decisão",
    answerRow("Indicadores", scale(r.d3_indicadores)) + answerRow("Decisões por dados", scale(r.d3_decisao)) + answerRow("Custo de pessoas", scale(r.d3_custo)));

  const v2Mix = v2?.d4?.vinculos?.composicao;
  const d4 = v2 ? section("04 · Dimensões Operacionais",
    answerRow("4.1 · Tamanho do quadro", employees[String(v2.d4.tamanho[0])] || "—") +
    answerRow("4.1 · Distribuição geográfica", scale(v2.d4.tamanho[1])) +
    answerRow("4.2 · Mix de vínculos", `CLT ${v2Mix?.clt ?? "–"}% · PJ ${v2Mix?.pj ?? "–"}% · Terceiros ${v2Mix?.terceiros ?? "–"}% · Estagiários ${v2Mix?.estagiarios ?? "–"}%`) +
    answerRow("4.2 · Gestão dos regimes", scale(v2.d4.vinculos.gestao)) +
    answerRow("4.3 · Nível de turnover", scale(v2.d4.rotatividade[0])) +
    answerRow("4.3 · Custo de gente no resultado", scale(v2.d4.rotatividade[1]))) : section("04 · Dimensões Operacionais",
    answerRow("Colaboradores", employees[String(r.d4_colaboradores)] || "—") + answerRow("Unidades", units[String(r.d4_unidades)] || "—") + answerRow("Mix de vínculos", mix) + answerRow("Turnover", scale(r.d4_turnover)));
  const lenses = section("Considerações complementares",
    answerRow("Tecnologia e IA", scale(r.l1_tecnologia)) + answerRow("Capacidade de execução", scale(r.l2_execucao)) + answerRow("Maturidade do RH interno", scale(r.l3_rh_interno)));

  return emailBaseWrap(`
    <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${DOURADO};font-weight:bold;margin-bottom:10px;">Nova resposta recebida</div>
    <p style="font-family:Georgia,serif;font-size:22px;color:${BORDO};margin:0 0 8px;font-weight:bold;">${escapeHtml(r.c_empresa)}</p>
    <p style="margin:0;color:${TAUPE};font-size:12px;">Protocolo ${escapeHtml(r.protocolo)} · formulário completo abaixo</p>
    ${contact}${d1}${d2}${d3}${d4}${lenses}
    <div style="text-align:center;margin-top:28px;"><a href="${PAINEL_URL}" style="display:inline-block;background:${DOURADO};color:${BORDO};font-weight:bold;text-decoration:none;padding:13px 26px;border-radius:100px;font-size:13px;">Abrir resposta no painel →</a></div>
  `, `Nova resposta no Mapa de People: ${String(r.c_empresa ?? "empresa")}.`);
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const payload = await request.json();
    const record = payload?.record;
    if (!record) return Response.json({ ok: false, error: "no_record" }, { status: 400 });
    if (!record.c_email) return Response.json({ ok: false, error: "missing_client_email" }, { status: 400 });

    const [adminEmail, clientEmail] = await Promise.all([
      sendEmail("patricia@calirh.com", `Novo Mapa de People — ${String(record.c_empresa ?? "sem empresa")}`, emailPatricia(record)),
      sendEmail(String(record.c_email), "Recebi suas respostas — Mapa de People | CALI", emailCliente(record)),
    ]);

    return Response.json({ ok: true, adminEmail, clientEmail });
  } catch (error) {
    console.error("Falha ao notificar Mapa de People", error);
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
});
