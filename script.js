// ============================================================
// script.js — FINAL FRONTEND VERSION
// Chat + Image both use backend
// ============================================================

// Backend URL
const BACKEND_URL = "https://ai-bot-backend-ay5i.onrender.com";

// ── Conversation history for the chatbot ─────────────────────
let conversationHistory = [];

// ── DOM element references ───────────────────────────────────
const tabChat = document.getElementById("tab-chat");
const tabImage = document.getElementById("tab-image");
const secChat = document.getElementById("section-chat");
const secImage = document.getElementById("section-image");

const chatMessages = document.getElementById("chat-messages");
const typingIndicator = document.getElementById("typing-indicator");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

const imagePrompt = document.getElementById("image-prompt");
const generateBtn = document.getElementById("generate-btn");
const imageLoader = document.getElementById("image-loader");
const imageResult = document.getElementById("image-result");
const generatedImg = document.getElementById("generated-img");
const downloadBtn = document.getElementById("download-btn");
const imageError = document.getElementById("image-error");

// ── Tab switching ─────────────────────────────────────────────
function switchTab(tab) {
  const isChatTab = tab === "chat";

  tabChat.classList.toggle("active", isChatTab);
  tabImage.classList.toggle("active", !isChatTab);

  tabChat.setAttribute("aria-selected", String(isChatTab));
  tabImage.setAttribute("aria-selected", String(!isChatTab));

  secChat.classList.toggle("active", isChatTab);
  secChat.classList.toggle("hidden", !isChatTab);
  secImage.classList.toggle("active", !isChatTab);
  secImage.classList.toggle("hidden", isChatTab);
}

tabChat.addEventListener("click", () => switchTab("chat"));
tabImage.addEventListener("click", () => switchTab("image"));

// ── Chat helpers ──────────────────────────────────────────────
function appendMessage(role, text, isError = false) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}${isError ? " error" : ""}`;

  const label = document.createElement("span");
  label.className = "msg-label";
  label.textContent = role === "user" ? "You" : "AI";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  wrapper.appendChild(label);
  wrapper.appendChild(bubble);
  chatMessages.appendChild(wrapper);

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setTyping(visible) {
  typingIndicator.classList.toggle("hidden", !visible);
  if (visible) chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setChatLoading(loading) {
  sendBtn.disabled = loading;
  chatInput.disabled = loading;
  setTyping(loading);
}

// ── Send chat message via backend ─────────────────────────────
async function sendMessage() {
  const userText = chatInput.value.trim();
  if (!userText) return;

  appendMessage("user", userText);
  chatInput.value = "";
  chatInput.style.height = "auto";

  conversationHistory.push({ role: "user", content: userText });

  setChatLoading(true);

  try {
    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: conversationHistory,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || `Server error: ${response.status}`);
    }

    const botReply = data?.reply?.trim();

    if (!botReply) {
      throw new Error("Received an empty response from the AI.");
    }

    conversationHistory.push({ role: "assistant", content: botReply });
    appendMessage("bot", botReply);
  } catch (err) {
    console.error("Chat error:", err);
    appendMessage(
      "bot",
      `⚠️ ${err.message}\n\nMake sure:\n• Backend is deployed and running\n• OPENROUTER_API_KEY is set in backend env vars`,
      true
    );
  } finally {
    setChatLoading(false);
    chatInput.focus();
  }
}

sendBtn.addEventListener("click", sendMessage);

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 140)}px`;
});

// ── Image generation ──────────────────────────────────────────
function setImageLoading(loading) {
  generateBtn.disabled = loading;
  imagePrompt.disabled = loading;
  imageLoader.classList.toggle("hidden", !loading);

  if (loading) {
    imageResult.classList.add("hidden");
    imageError.classList.add("hidden");
  }
}

function showImageError(msg) {
  imageError.textContent = `⚠️ ${msg}`;
  imageError.classList.remove("hidden");
}

async function generateImage() {
  const prompt = imagePrompt.value.trim();

  if (!prompt) {
    showImageError("Please enter a prompt before generating.");
    return;
  }

  setImageLoading(true);

  try {
    const response = await fetch(`${BACKEND_URL}/generate-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error || `Server error: ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    generatedImg.src = blobUrl;
    generatedImg.alt = `Generated image for: ${prompt}`;
    imageResult.classList.remove("hidden");

    downloadBtn.href = blobUrl;
    downloadBtn.download = "generated-image.png";
  } catch (err) {
    console.error("Image generation error:", err);
    showImageError(
      `${err.message}\n\nMake sure:\n• Backend is deployed and running\n• HF_TOKEN is set in backend env vars\n• Backend CORS allows your frontend URL`
    );
  } finally {
    setImageLoading(false);
  }
}

generateBtn.addEventListener("click", generateImage);

imagePrompt.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    generateImage();
  }
});

// ── Initialise chat with welcome message ─────────────────────
window.addEventListener("DOMContentLoaded", () => {
  appendMessage(
    "bot",
    "👋 Hi! I'm your AI assistant. Ask me anything or switch to the Image Generator tab to create images!"
  );
});