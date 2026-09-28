/*
  Cloudflare Worker для безпечного надсилання анкети в Telegram.

  У Cloudflare Worker відкрийте Settings -> Variables and Secrets та додайте:
  TELEGRAM_BOT_TOKEN — токен, який видасть BotFather
  TELEGRAM_CHAT_ID   — ID вашого чату або групи
  ALLOWED_ORIGIN     — https://vikamlar03-maker.github.io

  Токен не потрібно і не можна додавати в index.html або в GitHub.
*/

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    }
  });
}

export default {
  async fetch(request, env) {
    const allowedOrigin =
      env.ALLOWED_ORIGIN || "https://vikamlar03-maker.github.io";
    const requestOrigin = request.headers.get("Origin") || "";

    if (requestOrigin && requestOrigin !== allowedOrigin) {
      return jsonResponse({ ok: false }, 403, allowedOrigin);
    }

    if (request.method === "OPTIONS") {
      return jsonResponse({ ok: true }, 204, allowedOrigin);
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false }, 405, allowedOrigin);
    }

    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return jsonResponse(
        { ok: false, error: "Worker secrets are not configured" },
        500,
        allowedOrigin
      );
    }

    let data;

    try {
      data = await request.json();
    } catch (error) {
      return jsonResponse({ ok: false }, 400, allowedOrigin);
    }

    if (data.website) {
      return jsonResponse({ ok: true }, 200, allowedOrigin);
    }

    const name = String(data.name || "").trim().slice(0, 80);
    const attendance = data.attendance === "Так" ? "Так" :
      data.attendance === "Ні" ? "Ні" : "";
    const guests = Number(data.guests);

    if (
      !name ||
      !attendance ||
      (attendance === "Так" &&
        (!Number.isInteger(guests) || guests < 1 || guests > 10))
    ) {
      return jsonResponse({ ok: false }, 400, allowedOrigin);
    }

    const message = [
      "💌 Нова відповідь на весільне запрошення",
      "",
      `Ім’я: ${name}`,
      `Буде на весіллі: ${attendance}`,
      `Кількість гостей: ${attendance === "Так" ? guests : "—"}`
    ].join("\n");

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: message
        })
      }
    );

    if (!telegramResponse.ok) {
      return jsonResponse({ ok: false }, 502, allowedOrigin);
    }

    return jsonResponse({ ok: true }, 200, allowedOrigin);
  }
};
