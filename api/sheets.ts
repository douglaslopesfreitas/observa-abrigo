import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function (
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // 🔐 Credenciais em Base64
    const rawB64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!rawB64 || !spreadsheetId) {
      return res.status(500).json({
        error: "Missing env vars",
        hasSpreadsheetId: Boolean(spreadsheetId),
        hasServiceAccountB64: Boolean(rawB64),
      });
    }

    // Decodifica o JSON da Service Account
    const credentials = JSON.parse(
      Buffer.from(rawB64, "base64").toString("utf8")
    );

    if (!credentials.client_email || !credentials.private_key) {
      return res.status(500).json({
        error: "Invalid service account JSON",
        hasClientEmail: Boolean(credentials.client_email),
        hasPrivateKey: Boolean(credentials.private_key),
      });
    }

    // Corrige quebras de linha da private_key
    const privateKey =
      typeof credentials.private_key === "string"
        ? credentials.private_key.replace(/\\n/g, "\n")
        : credentials.private_key;

    // Auth Google
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: privateKey,
      },
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Range vindo por query (?range=sheet!A:Z)
    const range =
      typeof req.query.range === "string" && req.query.range
        ? req.query.range
        : "A:Z";

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return res.status(200).json({
      values: response.data.values || [],
    });
  } catch (err: any) {
    console.error("Sheets API error:", err);
    return res.status(500).json({
      error: "Internal error",
      details: err?.message || "Unknown error",
    });
  }
}