import { Router, type IRouter } from "express";
import { checkOllamaHealth } from "../lib/ollama";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const ollamaOk = await checkOllamaHealth();
  res.json({
    status: "ok",
    ollama: ollamaOk ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

router.get("/health/ollama", async (_req, res) => {
  const ok = await checkOllamaHealth();
  if (ok) {
    res.json({ status: "ok", message: "Ollama is running" });
  } else {
    res.status(503).json({
      status: "error",
      message: "Local AI service is not running. Please start Ollama.",
    });
  }
});

export default router;
