import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const contentFilePath = path.join(process.cwd(), "src", "data", "site-content.json");

const defaultSystemPrompt =
  "You are a helpful AI assistant on the portfolio website of plusesee, a designer and creative. Always reply in Chinese (Simplified). Keep responses concise, friendly, and creative.";
const defaultOfflineMessage = "AI 暂时离线，请稍后再试。";
const defaultCloudflareModel = "@cf/qwen/qwen3-30b-a3b-fp8";

const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_OUTPUT_TOKENS = 500;
const REQUEST_TIMEOUT_MS = 18000;
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 12;

const rateLimitStore = globalThis.__pluseseeChatRateLimitStore || new Map();
globalThis.__pluseseeChatRateLimitStore = rateLimitStore;

const getClientId = (req) => {
  const forwardedFor = req.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
};

const isRateLimited = (clientId) => {
  const now = Date.now();
  const current = rateLimitStore.get(clientId);

  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(clientId, { count: 1, startedAt: now });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
};

const normalizeMessages = (messages) => {
  if (!Array.isArray(messages)) return [];

  return messages
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => {
      const role = message?.role === "assistant" || message?.role === "user" ? message.role : null;
      const content = typeof message?.content === "string" ? message.content.trim() : "";

      if (!role || !content) return null;

      return {
        role,
        content: content.slice(0, MAX_MESSAGE_LENGTH),
      };
    })
    .filter(Boolean);
};

const getCloudflareReply = (data) => {
  const content =
    data?.result?.response ||
    data?.result?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.message?.content;

  if (typeof content !== "string") return "";

  return content.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();
};

const readAIConfig = async () => {
  try {
    const fileContents = await fs.readFile(contentFilePath, "utf8");
    const normalized = fileContents.replace(/^\uFEFF/, "");
    const content = JSON.parse(normalized);
    return {
      systemPrompt: content?.home?.ai?.systemPrompt || defaultSystemPrompt,
      offlineMessage: content?.home?.ai?.offlineMessage || defaultOfflineMessage,
    };
  } catch {
    return {
      systemPrompt: defaultSystemPrompt,
      offlineMessage: defaultOfflineMessage,
    };
  }
};

export async function POST(req) {
  const clientId = getClientId(req);

  if (isRateLimited(clientId)) {
    return NextResponse.json(
      { role: "assistant", content: "提问有点频繁，请稍后再试。" },
      { status: 429 }
    );
  }

  try {
    const { messages } = await req.json();
    const aiConfig = await readAIConfig();
    const safeMessages = normalizeMessages(messages);

    if (!safeMessages.length) {
      return NextResponse.json(
        { role: "assistant", content: "请输入问题后再发送。" },
        { status: 400 }
      );
    }

    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const configuredModel = process.env.CLOUDFLARE_AI_MODEL || defaultCloudflareModel;
    const model = /^@cf\/[a-z0-9._-]+\/[a-z0-9._-]+$/i.test(configuredModel)
      ? configuredModel
      : defaultCloudflareModel;

    if (!apiToken || !accountId) {
      return NextResponse.json({
        role: "assistant",
        content: aiConfig.offlineMessage,
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;

    try {
      response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content: aiConfig.systemPrompt,
              },
              ...safeMessages,
            ],
            stream: false,
            max_tokens: MAX_OUTPUT_TOKENS,
            temperature: 0.6,
          }),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json().catch(() => null);

    if (!response.ok || data?.success === false) {
      console.error("Cloudflare Workers AI error:", {
        status: response.status,
        errors: data?.errors,
      });
      return NextResponse.json(
        { role: "assistant", content: aiConfig.offlineMessage },
        { status: 502 }
      );
    }

    const content = getCloudflareReply(data);

    if (!content) {
      console.error("Cloudflare Workers AI returned an empty response");
      return NextResponse.json(
        { role: "assistant", content: aiConfig.offlineMessage },
        { status: 502 }
      );
    }

    return NextResponse.json({ role: "assistant", content });
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      {
        role: "assistant",
        content: error?.name === "AbortError" ? "AI 响应超时，请稍后再试。" : defaultOfflineMessage,
      },
      { status: error?.name === "AbortError" ? 504 : 500 }
    );
  }
}
