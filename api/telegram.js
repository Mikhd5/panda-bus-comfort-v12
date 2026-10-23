const ADMIN_ID = String(process.env.TELEGRAM_CHAT_ID || "8467521511");
const SITE_URL = "https://panda-bus-comfort-v12-xarf.vercel.app/";
const PHONE = "+380 68 502 27 13";

async function tg(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");
  const response = await fetch("https://api.telegram.org/bot" + token + "/" + method, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  return response.json();
}

async function send(chatId, text, keyboard) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: keyboard || {
      inline_keyboard: [
        [{ text: "🚌 Залишити заявку", url: SITE_URL + "#booking" }],
        [{ text: "✈️ Трансфер до аеропорту", url: SITE_URL + "#booking" }, { text: "📦 Передати посилку", url: SITE_URL + "#booking" }],
        [{ text: "🗺 Напрямки та послуги", url: SITE_URL + "#routes" }],
        [{ text: "☎️ Зв’язатися з менеджером", url: "https://wa.me/380685022713" }]
      ]
    }
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ ok: true, service: "Panda Bus Comfort bot" });

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) {
    return res.status(401).json({ ok: false });
  }

  const update = req.body || {};
  try {
    if (update.callback_query) {
      const q = update.callback_query;
      const chatId = q.message && q.message.chat && String(q.message.chat.id);
      const adminAction = String(q.data || "");
      if (String(q.from.id) !== ADMIN_ID || chatId !== ADMIN_ID) {
        await tg("answerCallbackQuery", { callback_query_id: q.id, text: "Ця дія доступна лише адміністратору.", show_alert: true });
        return res.status(200).json({ ok: true });
      }
      const match = adminAction.match(/^status:(PB-[0-9]+):(processing|confirmed|rejected)$/);
      if (match) {
        const labels = { processing: "🟡 В ОБРОБЦІ", confirmed: "✅ ПІДТВЕРДЖЕНА", rejected: "❌ ВІДХИЛЕНА" };
        const oldText = q.message.text || "";
        const cleanText = oldText.replace(/\n━━━━━━━━━━━━━━━━━━\n📌 <b>СТАТУС ЗМІНЕНО:<\/b>.*$/s, "");
        await tg("editMessageText", {
          chat_id: q.message.chat.id,
          message_id: q.message.message_id,
          text: cleanText + "\n━━━━━━━━━━━━━━━━━━\n📌 <b>СТАТУС ЗМІНЕНО:</b> " + labels[match[2]],
          parse_mode: "HTML",
          reply_markup: q.message.reply_markup
        });
        await tg("answerCallbackQuery", { callback_query_id: q.id, text: "Статус заявки оновлено" });
      } else {
        await tg("answerCallbackQuery", { callback_query_id: q.id });
      }
      return res.status(200).json({ ok: true });
    }

    const message = update.message;
    if (!message || !message.chat) return res.status(200).json({ ok: true });
    const chatId = message.chat.id;
    const text = String(message.text || "").trim();
    const firstName = String(message.from && message.from.first_name || "друже").replace(/[<>]/g, "").slice(0, 60);

    if (text === "/start" || text.startsWith("/start ")) {
      await send(chatId,
        "🐼 <b>Вітаємо в Panda Bus Comfort!</b>\n\n" +
        "Ваша дорога між Україною та Європою починається тут. 💚\n\n" +
        "🚌 <b>Міжнародні перевезення</b>\n" +
        "✈️ <b>Трансфери до аеропортів Польщі</b>\n" +
        "📦 <b>Посилки та передачі</b>\n\n" +
        "Оберіть, що вас цікавить. Заявка не є підтвердженим бронюванням — менеджер узгодить дату, наявність місць і вартість."
      );
    } else if (text === "/help") {
      await send(chatId, "ℹ️ <b>Допомога Panda Bus Comfort</b>\n\n/start — головне меню\n/new — залишити заявку\n/contact — контакти менеджера\n\n☎️ " + PHONE);
    } else if (text === "/new") {
      await send(chatId, "📝 <b>Оформимо вашу заявку</b>\n\nНатисніть кнопку нижче, заповніть маршрут, дату, кількість пасажирів і контакт. Заявка автоматично надійде менеджеру, коли підключимо форму сайту.", {
        inline_keyboard: [[{ text: "🚌 Заповнити форму", url: SITE_URL + "#booking" }]]
      });
    } else if (text === "/contact") {
      await send(chatId, "☎️ <b>Зв’язок із Panda Bus Comfort</b>\n\nОсновний номер: " + PHONE + "\nДодатковий: +380 68 992 31 70\n\nОберіть зручний спосіб:", {
        inline_keyboard: [
          [{ text: "💬 WhatsApp", url: "https://wa.me/380685022713" }, { text: "🌐 Відкрити сайт", url: SITE_URL }],
          [{ text: "📞 Зателефонувати", url: "tel:+380685022713" }]
        ]
      });
    } else if (text === "/admin") {
      if (String(message.from && message.from.id) !== ADMIN_ID) {
        await send(chatId, "🔒 Адмін-меню доступне лише менеджеру.");
      } else {
        await send(chatId, "🛠 <b>PANDA BUS COMFORT · ADMIN</b>\n\n🐼 Бот онлайн. Нові заявки із сайту надходитимуть сюди після налаштування змінних середовища.\n\nШвидкі дії:", {
          inline_keyboard: [
            [{ text: "🌐 Відкрити сайт", url: SITE_URL }],
            [{ text: "🧪 Перевірити заявку", callback_data: "admin:test" }]
          ]
        });
      }
    } else if (text === "/admin" || text.startsWith("/")) {
      await send(chatId, "Не знайшов таку команду, " + firstName + ". Натисніть /start, щоб відкрити меню.");
    } else {
      await send(chatId, "Дякую за повідомлення! 💚 Щоб заявка не загубилася, заповніть коротку форму на сайті — вона містить маршрут, дату та контакт.", {
        inline_keyboard: [
          [{ text: "🚌 Заповнити заявку", url: SITE_URL + "#booking" }],
          [{ text: "☎️ Зв’язатися з менеджером", url: "https://wa.me/380685022713" }]
        ]
      });
    }
  } catch (error) {
    console.error("Panda Bus bot webhook error:", error.message);
  }
  return res.status(200).json({ ok: true });
}
