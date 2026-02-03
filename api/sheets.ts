import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function tryParseJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function decodeB64ToUtf8(b64: string) {
  return Buffer.from(b64, "base64").toString("utf8");
}

function getCredentialsFromEnv(raw: string) {
  const trimmed = (raw || "").trim();

  const asJson = tryParseJson(trimmed);
  if (asJson) return asJson;

  const once = decodeB64ToUtf8(trimmed);
  const onceJson = tryParseJson(once.trim());
  if (onceJson) return onceJson;

  const twice = decodeB64ToUtf8(once.trim());
  const twiceJson = tryParseJson(twice.trim());
  if (twiceJson) return twiceJson;

  throw new Error("Credenciais inválidas: não consegui interpretar como JSON.");
}

export default async function (req: VercelRequest, res: VercelResponse) {
  try {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!raw || !spreadsheetId) {
      return res.status(500).json({
        error: "Missing env vars",
        hasSpreadsheetId: Boolean(spreadsheetId),
        hasServiceAccountB64: Boolean(raw),
      });
    }

    const credentials = getCredentialsFromEnv(raw);

    if (!credentials?.client_email || !credentials?.private_key) {
      return res.status(500).json({
        error: "Invalid service account JSON",
        hasClientEmail: Boolean(credentials?.client_email),
        hasPrivateKey: Boolean(credentials?.private_key),
      });
    }

    const privateKey =
      typeof credentials.private_key === "string"
        ? credentials.private_key.replace(/\\n/g, "\n")
        : credentials.private_key;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: privateKey,
      },
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
      clientOptions: {
        subject: "douglas@redeabrigo.org",
      },
    });

    const sheets = google.sheets({ version: "v4", auth });

    const range =
      typeof req.query.range === "string" && req.query.range
        ? req.query.range
        : "A:Z";

    // 1) Dados do range solicitado
    const valuesResp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    // 2) Data controlada por você (só muda quando mexe em "acolhidos")
    let updatedAt: string | null = null;
    try {
      const metaResp = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "_meta!B1:B1",
      });
      const v = metaResp.data.values?.[0]?.[0];
      updatedAt = v ? String(v) : null;
    } catch {
      updatedAt = null;
    }

    return res.status(200).json({
      values: valuesResp.data.values || [],
      updatedAt,
    });
  } catch (err: any) {
    console.error("Sheets API error:", err);
    return res.status(500).json({
      error: "Internal error",
      details: err?.message || "Unknown error",
    });
  }
}