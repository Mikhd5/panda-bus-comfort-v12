const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "8467521511";

function clean(value, max = 500) {
  return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max) || "Не вказано";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(503).json({ ok: false, error: "Booking notifications are not configured" });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const from = clean(body.from, 120);
  const to = clean(body.to, 120);
  const date = clean(body.date, 40);
  const contact = clean(body.contact, 120);
  if (!from || !to || !date || !contact) {
    return res.status(400).json({ ok: false, error: "Заповніть маршрут, дату та контакт." });
  }

  const requestId = "PB-" + Date.now().toString().slice(-7);
  const text = [
    "🐼 <b>НОВА ЗАЯВКА PANDA BUS COMFORT</b>",
    "━━━━━━━━━━━━━━━━━━",
    "🆔 <b>Номер:</b> " + requestId,
    "🧭 <b>Звідки:</b> " + clean(from, 120),
    "📍 <b>Куди:</b> " + clean(to, 120),
    "📅 <b>Дата:</b> " + clean(body.date, 40),
    "🔁 <b>Повернення:</b> " + clean(body.returnDate, 40),
    "👥 <b>Пасажири:</b> " + clean(body.passengers, 20),
    "🗂 <b>Тип запиту:</b> " + clean(body.kind, 100),
    "☎️ <b>Контакт:</b> " + clean(contact, 120),
    "💬 <b>Як відповісти:</b> " + clean(body.contactMethod, 80),
    "📝 <b>Деталі:</b> " + clean(body.note, 700),
    "━━━━━━━━━━━━━━━━━━",
    "⏳ <b>Статус:</b> Нова"
  ].join("\n");

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🟡 В обробці", callback_data: "status:" + requestId + ":processing" },
        { text: "✅ Підтверджена", callback_data: "status:" + requestId + ":confirmed" }
      ],
      [
        { text: "❌ Відхилити", callback_data: "status:" + requestId + ":rejected" },
        { text: "🌐 Відкрити сайт", url: "https://panda-bus-comfort-v12-xarf.vercel.app/" }
      ]
    ]
  };

  const response = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      text,
      parse_mode: "HTML",
      reply_markup: keyboard,
      disable_web_page_preview: true
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    console.error("Telegram sendMessage failed", result.description || response.status);
    return res.status(502).json({ ok: false, error: "Не вдалося надіслати заявку в Telegram." });
  }

  return res.status(200).json({ ok: true, requestId });
}
