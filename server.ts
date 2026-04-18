import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Secure Diagnostics API
  // Only returns presence of keys, never the values
  app.get("/api/diagnostics", (req, res) => {
    res.json({
      gemini: !!process.env.GEMINI_API_KEY,
      maps: !!process.env.VITE_GOOGLE_MAPS_API_KEY,
      sports: !!process.env.SPORTS_DATA_API_KEY,
      weather: !!process.env.WEATHER_API_KEY,
      twilio: !!process.env.TWILIO_AUTH_TOKEN,
      telegram: !!process.env.VITE_TELEGRAM_BOT_TOKEN && !!process.env.VITE_TELEGRAM_CHAT_ID
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
