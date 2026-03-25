// ============================================================
// server.js — FINAL WORKING VERSION
// Uses Hugging Face Router + Nscale SDXL provider
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

// Loaded from .env file — never hardcode secrets in source
const HF_TOKEN = process.env.HF_TOKEN;

// Router endpoint from the Hugging Face model/provider panel
const HF_IMAGE_URL = "https://router.huggingface.co/nscale/v1/images/generations";

// ============================================================
// IMAGE GENERATION ROUTE
// ============================================================

app.post("/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;

    // Validate prompt
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: "Prompt is required",
      });
    }

    console.log("Generating image for:", prompt);

    // Call Hugging Face router
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

    // Read raw text first
    const rawText = await hfResponse.text();

    // Handle provider/API errors
    if (!hfResponse.ok) {
      console.error("HF Error:", rawText);

      return res.status(hfResponse.status).json({
        error: rawText || "Hugging Face request failed",
      });
    }

    // Parse JSON response
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      return res.status(500).json({
        error: "Invalid JSON response from image provider",
      });
    }

    // Extract base64 image
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

    // Convert base64 to binary image buffer
    const imageBuffer = Buffer.from(base64Image, "base64");

    // Send image back to frontend
    res.set("Content-Type", "image/png");
    res.send(imageBuffer);
  } catch (error) {
    console.error("Server error:", error);

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