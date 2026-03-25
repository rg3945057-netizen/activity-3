// ============================================================
// server.js — FINAL WORKING VERSION
// Chat + Image both handled through backend
// ============================================================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Allow frontend to call backend
app.use(cors());

// Parse JSON request body
app.use(express.json({ limit: "2mb" }));

// ============================================================
// CONFIG
// ============================================================

const HF_TOKEN = process.env.HF_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const HF_IMAGE_URL = "https://router.huggingface.co/nscale/v1/images/generations";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ============================================================
// CHAT ROUTE
// ============================================================

app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Messages array is required",
      });
    }

    const orResponse = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: messages,
      }),
    });

    const rawText = await orResponse.text();

    if (!orResponse.ok) {
      console.error("OpenRouter Error:", rawText);
      return res.status(orResponse.status).json({
        error: rawText || "OpenRouter request failed",
      });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error("OpenRouter JSON Parse Error:", parseError);
      return res.status(500).json({
        error: "Invalid JSON response from chat provider",
      });
    }

    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({
        error: "No reply returned from chat provider",
      });
    }

    res.json({ reply });
  } catch (error) {
    console.error("Chat route error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// ============================================================
// IMAGE GENERATION ROUTE
// ============================================================

app.post("/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: "Prompt is required",
      });
    }

    console.log("Generating image for:", prompt);

    const hfResponse = await fetch(HF_IMAGE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        response_format: "b64_json",
        prompt: prompt,
        model: "stabilityai/stable-diffusion-xl-base-1.0",
      }),
    });

    const rawText = await hfResponse.text();

    if (!hfResponse.ok) {
      console.error("HF Error:", rawText);
      return res.status(hfResponse.status).json({
        error: rawText || "Hugging Face request failed",
      });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error("HF JSON Parse Error:", parseError);
      return res.status(500).json({
        error: "Invalid JSON response from image provider",
      });
    }

    const base64Image =
      data?.data?.[0]?.b64_json ||
      data?.images?.[0]?.b64_json ||
      data?.b64_json;

    if (!base64Image) {
      console.error("No image found in response:", data);
      return res.status(500).json({
        error: "No image returned from provider",
      });
    }

    const imageBuffer = Buffer.from(base64Image, "base64");

    res.set("Content-Type", "image/png");
    res.send(imageBuffer);
  } catch (error) {
    console.error("Image route error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});