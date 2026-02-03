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

  // Caso 1: já é JSON direto
  const asJson = tryParseJson(trimmed);
  if (asJson) return asJson;

  // Caso 2: Base64 uma vez
  const once = decodeB64ToUtf8(trimmed);
  const onceJson = tryParseJson(once.trim());
  if (onceJson) return onceJson;

  // Caso 3: Base64 duas vezes (quando colam base64 do base64)
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

    // ✅ Impersonação obrigatória quando Domain-wide delegation está ativa
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

    // 1) Dados do range
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    // 2) ✅ Data real de última modificação do arquivo (Drive)
    const drive = google.drive({ version: "v3", auth });
    const file = await drive.files.get({
      fileId: spreadsheetId,
      fields: "modifiedTime",
      supportsAllDrives: true, // importante para Drive Compartilhado
    });

    return res.status(200).json({
      values: response.data.values || [],
      updatedAt: file.data.modifiedTime || null,
    });
  } catch (err: any) {
    console.error("Sheets API error:", err);
    return res.status(500).json({
      error: "Internal error",
      details: err?.message || "Unknown error",
    });
  }
}