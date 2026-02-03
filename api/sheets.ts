import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function (
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const rawCreds = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!rawCreds || !spreadsheetId) {
      return res.status(500).json({
        error: "Missing env vars: SPREADSHEET_ID or GOOGLE_SERVICE_ACCOUNT_JSON",
      });
    }

    const credentials = JSON.parse(rawCreds.trim());

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
    });

    const sheets = google.sheets({ version: "v4", auth });

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