import { requireSession } from '../_lib/auth-session.mjs';
import { resolveByokCredential } from '../_lib/byok-resolver.mjs';

const allowedProviders = new Set(['openai', 'gemini', 'nvidia', 'openrouter']);
const maxPayloadBytes = 60000;

function fail(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function cleanBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function parseJsonContent(content) {
  const text = String(content || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(text);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed.' });

  try {
    const session = await requireSession(req);
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const provider = String(body.provider || '').trim();
    const targetLanguage = String(body.targetLanguage || '').trim().slice(0, 80);
    const texts = body.texts && typeof body.texts === 'object' ? body.texts : null;

    if (!allowedProviders.has(provider)) fail(400, 'Selecione um provedor de IA configurado antes de traduzir.');
    if (!targetLanguage) fail(400, 'Informe o idioma de destino.');
    if (!texts) fail(400, 'Nenhum texto foi enviado para tradução.');
    const encoded = JSON.stringify(texts);
    if (Buffer.byteLength(encoded, 'utf8') > maxPayloadBytes) fail(413, 'O conteúdo é grande demais para tradução em uma única operação.');

    const credential = await resolveByokCredential(session.user.id, provider);
    if (!credential?.secret) fail(400, 'O provedor selecionado não possui uma chave protegida configurada.');
    const baseUrl = cleanBaseUrl(credential.baseUrl);
    const model = String(credential.modelId || '').trim();
    if (!baseUrl || !model) fail(400, 'A URL base e o modelo do provedor precisam estar configurados.');

    const prompt = [
      `Traduza os valores textuais do JSON fornecido para ${targetLanguage}.`,
      'Retorne SOMENTE JSON válido com exatamente a mesma estrutura e as mesmas chaves.',
      'Não altere números, fórmulas, IDs, canonicalIds, enums, nomes de campos, referências, URLs, unidades, CDs, dados ou mecânicas.',
      'Preserve marcadores, placeholders, notação de dados e termos técnicos quando necessário.',
      'Traduza apenas o texto natural presente nos valores.',
      '',
      encoded,
    ].join('\n');

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credential.secret}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          { role: 'system', content: 'Você é um tradutor técnico de conteúdo de RPG. Preserve rigorosamente estrutura e mecânicas.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerMessage = data?.error?.message || data?.message || `HTTP ${response.status}`;
      fail(502, `O provedor de IA recusou a tradução: ${providerMessage}`);
    }
    const content = data?.choices?.[0]?.message?.content;
    if (!content) fail(502, 'O provedor não retornou conteúdo traduzido.');

    let translated;
    try { translated = parseJsonContent(content); }
    catch { fail(502, 'A IA retornou uma tradução em formato inválido. Tente novamente.'); }

    return res.status(200).json({ ok: true, translated });
  } catch (error) {
    console.error('Homebrew translation endpoint error:', error?.message || error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || 'Falha ao traduzir o conteúdo Homebrew.' });
  }
}
