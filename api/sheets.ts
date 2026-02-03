import { google } from "googleapis";

export default async function handler(req: any, res: any) {
  try {
    const rawCreds = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!rawCreds || !spreadsheetId) {
      return res.status(500).json({ error: "Missing env vars: Check SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON" });
    }

    // O .trim() remove espaços em branco invisíveis no início e no fim que causam o erro de parse
    const credentials = JSON.parse(rawCreds.trim());

    // Corrige a private_key quando ela vem com \\n (comum no ambiente da Vercel)
    const fixedPrivateKey =
      typeof credentials.private_key === "string"
        ? credentials.private_key.replace(/\\n/g, "\n")
        : credentials.private_key;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: fixedPrivateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Pega o range da query ou usa um padrão
    const range = String(req.query?.range || "").trim() || "A1:Z1000";

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    // Retorna os dados da planilha
    return res.status(200).json({ values: response.data.values || [] });
  } catch (err: any) {
    console.error("Erro na API de Sheets:", err);
    return res.status(500).json({ 
      error: "Internal error", 
      details: err?.message || "Unknown error" 
    });
  }
}
