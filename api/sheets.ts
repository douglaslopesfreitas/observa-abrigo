import { google } from "googleapis";

export default async function handler(req: any, res: any) {
  try {
    // CORS básico (pra testes)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();

    const spreadsheetId = process.env.SPREADSHEET_ID;
    const credsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!spreadsheetId) return res.status(500).json({ error: "Missing SPREADSHEET_ID env var" });
    if (!credsRaw) return res.status(500).json({ error: "Missing GOOGLE_SERVICE_ACCOUNT_JSON env var" });

    const range = String(req.query?.range || "").trim();
    if (!range) return res.status(400).json({ error: "Missing range query param" });

    const creds = JSON.parse(credsRaw);

    const fixedPrivateKey =
      typeof creds.private_key === "string" ? creds.private_key.replace(/\\n/g, "\n") : creds.private_key;

    // ✅ assinatura correta (1 argumento)
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
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
