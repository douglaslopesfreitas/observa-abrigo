import { google } from "googleapis";

export default async function handler(req: any, res: any) {
  try {
    const rawCreds = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!rawCreds || !spreadsheetId) {
      return res.status(500).json({ error: "Missing env vars" });
    }

    const credentials = JSON.parse(rawCreds);

    // Corrige a private_key quando ela vem com \\n no Vercel
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

    const range = String(req.query?.range || "").trim() || "A1:Z1000";

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return res.status(200).json({ values: response.data.values || [] });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
}