import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { google } from "googleapis";
import fs from "fs";

dotenv.config();

const app = express();

// ✅ FIX 304: desliga ETag (Express pode responder 304 e vir sem body)
app.disable("etag");

// Middlewares
app.use(cors());
app.use(express.json());

// ✅ FIX 304: força no-cache em tudo que é /api
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
  }
  next();
});

const PORT = process.env.PORT || 8787;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "";
const CREDS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || "";

function fileExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    port: PORT,
    hasSpreadsheetId: Boolean(SPREADSHEET_ID),
    spreadsheetIdPreview: SPREADSHEET_ID
      ? `${SPREADSHEET_ID.slice(0, 6)}...${SPREADSHEET_ID.slice(-6)}`
      : "",
    hasCredsPath: Boolean(CREDS_PATH),
    credsPath: CREDS_PATH,
    credsFileExists: CREDS_PATH ? fileExists(CREDS_PATH) : false,
  });
});

const auth = new google.auth.GoogleAuth({
  keyFile: CREDS_PATH,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
  ],
});

const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

app.get("/api/sheets", async (req, res) => {
  try {
    const range = req.query.range;

    if (!SPREADSHEET_ID) return res.status(500).json({ error: "SPREADSHEET_ID vazio no .env" });
    if (!CREDS_PATH) return res.status(500).json({ error: "GOOGLE_APPLICATION_CREDENTIALS vazio no .env" });
    if (!fileExists(CREDS_PATH)) return res.status(500).json({ error: "Arquivo JSON não encontrado" });
    if (!range) return res.status(400).json({ error: "range é obrigatório" });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: String(range),
    });

    // ✅ garante body sempre
    res.status(200).json({ values: result.data.values || [] });
  } catch (e) {
    console.error("Erro /api/sheets:", e?.message || e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ✅ updated-at com supportsAllDrives:true
app.get("/api/sheets/updated-at", async (req, res) => {
  try {
    if (!SPREADSHEET_ID) return res.status(500).json({ error: "SPREADSHEET_ID vazio no .env" });
    if (!CREDS_PATH) return res.status(500).json({ error: "GOOGLE_APPLICATION_CREDENTIALS vazio no .env" });
    if (!fileExists(CREDS_PATH)) return res.status(500).json({ error: "Arquivo JSON não encontrado" });

    const meta = await drive.files.get({
      fileId: SPREADSHEET_ID,
      fields: "modifiedTime",
      supportsAllDrives: true,
    });

    res.status(200).json({ modifiedTime: meta.data.modifiedTime });
  } catch (e) {
    console.error("Erro /api/sheets/updated-at:", e?.message || e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`Server rodando em http://localhost:${PORT}`);
});