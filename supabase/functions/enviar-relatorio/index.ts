import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const ADMIN_EMAIL = "patricia@calirh.com";
const FROM_EMAIL = "Patrícia Lima · CALI RH <patricia@calirh.com>";
const LOGO_URL = "https://mapa.calirh.com/logo.png";
const WHATSAPP_URL = "https://wa.me/5541987791933?text=Oi%2C%20Patr%C3%ADcia!%20Recebi%20meu%20relat%C3%B3rio%20do%20Mapa%20de%20People%20e%20gostaria%20de%20conversar%20sobre%20o%20resultado.";
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MAX_RECIPIENTS = 8;
const MAX_CUSTOM_MESSAGE = 3000;

const BORDO = "#5A1E2D";
const MARFIM = "#F7F3EE";
const DOURADO = "#B58C52";
const GRAFITE = "#2B2B2B";
const TAUPE = "#B7A99A";

const ALLOWED_ORIGINS = new Set([
  "https://mapa.calirh.com",
  "https://app.calirh.com",
  "http://localhost:3000",
  "http://localhost:4173",
  "http://localhost:5173",
]);

type MapaResposta = {
  id: string;
  c_nome: string | null;
  c_empresa: string | null;
  c_email: string | null;
  protocolo: string | null;
};

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const permitido = ALLOWED_ORIGINS.has(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  return {
    "Access-Control-Allow-Origin": permitido ? origin : "https://mapa.calirh.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(request: Request, body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders(request) });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstName(value: unknown) {
  return String(value ?? "").trim().split(/\s+/)[0] || "";
}

function safeFilenamePart(value: unknown, fallback: string) {
  const cleaned = String(value ?? "")
    .normalize("NFC")
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  return (cleaned || fallback).slice(0, 80);
}

function reportFilename(record: MapaResposta) {
  const identification = safeFilenamePart(record.c_empresa || record.c_nome, "Decisor");
  const protocol = safeFilenamePart(record.protocolo, "sem protocolo");
  return `Mapa de People — Relatório — ${identification} — CALI RH — ${protocol}.pdf`;
}

function decodeBase64Pdf(value: unknown) {
  const base64 = String(value ?? "").replace(/^data:application\/pdf;base64,/i, "").replace(/\s/g, "");
  if(!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error("PDF inválido ou ausente.");
  const estimatedBytes = Math.floor(base64.length * 3 / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  if(estimatedBytes > MAX_PDF_BYTES) throw new Error("O PDF ultrapassa o limite de 8 MB.");
  let signature = "";
  try {
    signature = atob(base64.slice(0, 16));
  } catch {
    throw new Error("Não foi possível validar o PDF.");
  }
  if(!signature.startsWith("%PDF-")) throw new Error("O anexo selecionado não é um PDF válido.");
  return base64;
}

function normalizeRecipients(value: unknown, fallback: unknown) {
  let source: unknown[];
  if(Array.isArray(value)) source = value;
  else if(typeof value === "string") source = value.split(/[;,]/);
  else source = [fallback];

  const recipients = [...new Set(source
    .map(item => String(item ?? "").trim().toLowerCase())
    .filter(Boolean))];

  if(!recipients.length) throw new Error("Informe pelo menos um destinatário válido.");
  if(recipients.length > MAX_RECIPIENTS) throw new Error(`Use no máximo ${MAX_RECIPIENTS} destinatários por envio.`);
  const invalid = recipients.find(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  if(invalid) throw new Error(`E-mail de destinatário inválido: ${invalid}`);
  return recipients;
}

function normalizeCustomMessage(value: unknown) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, MAX_CUSTOM_MESSAGE);
}

function customMessageHtml(value: string) {
  if(!value) return "";
  const safe = escapeHtml(value).replaceAll("\n", "<br>");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#FBF7F3;border:1px solid #E8DDD4;border-radius:10px;">
    <tr><td style="padding:17px 18px;">
      <div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${DOURADO};font-weight:700;margin-bottom:7px;">Uma observação minha</div>
      <div style="font-size:14px;line-height:1.65;color:${GRAFITE};">${safe}</div>
    </td></tr>
  </table>`;
}

function emailHtml(record: MapaResposta, customMessage = "") {
  const name = firstName(record.c_nome);
  const company = escapeHtml(record.c_empresa || "sua empresa");
  const protocol = escapeHtml(record.protocolo || "—");
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
</head>
<body bgcolor="${MARFIM}" style="margin:0;padding:0;background:${MARFIM};font-family:Arial,Helvetica,sans-serif;color:${GRAFITE};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Seu relatório do Mapa de People está pronto e segue anexado.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${MARFIM}" style="background:${MARFIM};">
    <tr><td align="center" style="padding:32px 14px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#FFFFFF;border:1px solid #EAE1D8;border-radius:16px;overflow:hidden;box-shadow:0 12px 38px rgba(90,30,45,.08);">
        <tr><td align="center" bgcolor="${BORDO}" style="padding:34px 28px;background:${BORDO};"><img src="${LOGO_URL}" width="168" alt="CALI RH" style="display:block;max-width:100%;height:auto;border:0;"></td></tr>
        <tr><td style="padding:38px 34px 12px;">
          <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${DOURADO};font-weight:700;margin-bottom:11px;">Mapa de People · devolutiva</div>
          <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:29px;line-height:1.18;font-weight:400;color:${BORDO};margin:0 0 20px;">Seu relatório chegou 🎉</h1>
          <p style="font-size:15px;line-height:1.7;margin:0 0 15px;">Olá${name ? `, ${escapeHtml(name)}` : ""}.</p>
          ${customMessageHtml(customMessage)}
          <p style="font-size:15px;line-height:1.7;margin:0 0 15px;">O relatório gratuito do <b>Mapa de People da ${company}</b> está pronto e segue anexado a este e-mail.</p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 20px;">A análise traduz as respostas em uma leitura prática sobre o momento atual da empresa. No material, você encontrará:</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${MARFIM};border-left:3px solid ${DOURADO};border-radius:0 10px 10px 0;">
            <tr><td style="padding:19px 20px;font-size:14px;line-height:1.65;color:${GRAFITE};">
              <div style="margin-bottom:7px;">• a posição da empresa no mapa de maturidade;</div>
              <div style="margin-bottom:7px;">• a leitura das quatro dimensões avaliadas;</div>
              <div style="margin-bottom:7px;">• os principais riscos, prioridades e pontos de atenção;</div>
              <div>• meus apontamentos e o caminho que recomendo como próximo passo.</div>
            </td></tr>
          </table>
          <p style="font-size:15px;line-height:1.7;margin:22px 0 15px;">Eu adoraria conversar um pouco mais sobre o resultado, ouvir a sua leitura e mostrar o que eu priorizaria primeiro.</p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 24px;">Você pode responder diretamente a este e-mail, que a mensagem chega para mim, ou falar comigo pelo WhatsApp.</p>
          <div style="text-align:center;margin:4px 0 28px;"><a href="${WHATSAPP_URL}" style="display:inline-block;background:${BORDO};color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;padding:14px 25px;border-radius:100px;">Vamos conversar?</a></div>
          <div style="height:1px;background:#EAE1D8;margin:0 0 23px;"></div>
          <p style="font-size:14px;line-height:1.6;margin:0 0 3px;">Um abraço,</p>
          <p style="font-family:Georgia,'Times New Roman',serif;font-style:normal;font-size:18px;font-weight:400;color:${BORDO};margin:0 0 3px;">Patrícia Lima</p>
          <p style="font-size:10px;line-height:1.5;letter-spacing:.1em;text-transform:uppercase;color:${TAUPE};margin:0 0 5px;">People Advisory Executive · CALI RH</p>
          <p style="font-size:12px;line-height:1.55;color:${TAUPE};margin:0;">patricia@calirh.com · (41) 98779-1933 · calirh.com</p>
        </td></tr>
        <tr><td align="center" bgcolor="${MARFIM}" style="padding:18px 24px;background:${MARFIM};font-size:10px;line-height:1.5;color:${TAUPE};">Protocolo ${protocol} · Este relatório foi elaborado a partir das respostas fornecidas no Mapa de People.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function emailText(record: MapaResposta, customMessage = "") {
  const name = firstName(record.c_nome);
  const company = record.c_empresa || "sua empresa";
  const personal = customMessage ? `${customMessage}\n\n` : "";
  return `Olá${name ? `, ${name}` : ""}.

${personal}Seu relatório do Mapa de People da ${company} chegou 🎉

O PDF segue anexado. Nele, você encontrará a posição da empresa no mapa de maturidade, a leitura das quatro dimensões avaliadas, os principais riscos e prioridades e meus apontamentos sobre o próximo passo recomendado.

Eu adoraria conversar um pouco mais sobre o resultado, ouvir a sua leitura e mostrar o que eu priorizaria primeiro.

Você pode responder diretamente a este e-mail ou falar comigo pelo WhatsApp: ${WHATSAPP_URL}

Um abraço,
Patrícia Lima
People Advisory Executive · CALI RH
patricia@calirh.com · (41) 98779-1933 · calirh.com

Protocolo: ${record.protocolo || "—"}`;
}

async function sendReport(record: MapaResposta, pdfBase64: string, requestId: unknown, recipients: string[], customMessage: string) {
  if(!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada.");
  const safeRequestId = String(requestId ?? crypto.randomUUID()).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `mapa-report-${record.id}-${safeRequestId}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: recipients,
      reply_to: ADMIN_EMAIL,
      subject: "Seu relatório do Mapa de People chegou 🎉 | CALI RH",
      html: emailHtml(record, customMessage),
      text: emailText(record, customMessage),
      attachments: [{ filename: reportFilename(record), content: pdfBase64 }],
    }),
  });
  const body = await response.text();
  if(!response.ok) throw new Error(`Falha no serviço de e-mail (${response.status}): ${body}`);
  return JSON.parse(body);
}

Deno.serve(async (request: Request) => {
  if(request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if(request.method !== "POST") return json(request, { ok: false, error: "Método não permitido." }, 405);

  try {
    if(!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Configuração do Supabase incompleta.");
    }
    const authorization = request.headers.get("Authorization");
    if(!authorization) return json(request, { ok: false, error: "Sessão administrativa ausente." }, 401);

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if(authError || !user) return json(request, { ok: false, error: "Sessão administrativa inválida." }, 401);
    if(String(user.email || "").toLowerCase() !== ADMIN_EMAIL) {
      return json(request, { ok: false, error: "Usuário sem permissão para enviar relatórios." }, 403);
    }

    const payload = await request.json();
    const responseId = String(payload?.response_id ?? "").trim();
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(responseId)) {
      return json(request, { ok: false, error: "Registro do relatório inválido." }, 400);
    }
    const pdfBase64 = decodeBase64Pdf(payload?.pdf_base64);

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: record, error: recordError } = await adminClient
      .from("mapa_respostas")
      .select("id,c_nome,c_empresa,c_email,protocolo")
      .eq("id", responseId)
      .single<MapaResposta>();
    if(recordError || !record) return json(request, { ok: false, error: "Relatório não encontrado." }, 404);

    const recipients = normalizeRecipients(payload?.recipients, record.c_email);
    const customMessage = normalizeCustomMessage(payload?.custom_message);
    const email = await sendReport(record, pdfBase64, payload?.request_id, recipients, customMessage);
    const { error: statusError } = await adminClient.from("mapa_respostas").update({ status: "enviado" }).eq("id", record.id);
    if(statusError) console.error("E-mail enviado, mas o status não foi atualizado", statusError);

    return json(request, {
      ok: true,
      email_id: email?.id ?? null,
      to: recipients,
      filename: reportFilename(record),
      status_updated: !statusError,
    });
  } catch(error) {
    console.error("Falha ao enviar relatório", error);
    const message = error instanceof Error ? error.message : "Falha inesperada ao enviar o relatório.";
    const status = /PDF|anexo|8 MB|e-mail|destinatário/i.test(message) ? 400 : 500;
    return json(request, { ok: false, error: message }, status);
  }
});
