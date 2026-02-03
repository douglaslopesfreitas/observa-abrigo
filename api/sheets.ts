import { google } from "googleapis";

// Vercel serverless: req/res estilo Node
export default async function handler(req: any, res: any) {
  try {
    // CORS básico
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const spreadsheetId = process.env.SPREADSHEET_ID;
    const credsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!spreadsheetId) {
      return res.status(500).json({ error: "Missing SPREADSHEET_ID env var" });
    }
    if (!credsRaw) {
      return res
        .status(500)
        .json({ error: "Missing GOOGLE_SERVICE_ACCOUNT_JSON env var" });
    }

    const range = String(req.query?.range || "").trim();
    if (!range) {
      return res.status(400).json({ error: "Missing range query param" });
    }

    // Credenciais (vem como JSON em uma linha)
    const creds = JSON.parse(credsRaw);

    // Corrige caso a private_key venha com \\n literal
    const fixedPrivateKey =
      typeof creds.private_key === "string"
        ? creds.private_key.replace(/\\n/g, "\n").trim()
        : creds.private_key;

    // Forma atual do googleapis (evita o erro "Expected 0-1 arguments, but got 4")
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: fixedPrivateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return res.status(200).json({ values: resp.data.values || [] });
  } catch (e: any) {
    return res.status(500).json({
      error: e?.message || String(e),
      details: e?.response?.data || undefined,
    });
  }
}
