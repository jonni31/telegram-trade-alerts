const TelegramBot = require("node-telegram-bot-api");
const https = require("https");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const alerts = new Map();
let id = 1;

function fetchPrice(coin) {
  return new Promise((resolve, reject) => {
    https.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`, (res) => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => resolve(JSON.parse(d)[coin]?.usd || null));
    }).on("error", reject);
  });
}

bot.onText(/\/price (.+)/, async (msg, m) => {
  const p = await fetchPrice(m[1].toLowerCase());
  bot.sendMessage(msg.chat.id, p ? `$${m[1].toUpperCase()}: $${p.toLocaleString()}` : "Not found");
});

bot.onText(/\/alert (\S+) (\d+)/, (msg, m) => {
  alerts.set(id++, { chatId: msg.chat.id, coin: m[1].toLowerCase(), target: +m[2] });
  bot.sendMessage(msg.chat.id, `Alert set: ${m[1].toUpperCase()} at $${+m[2]}`);
});

setInterval(async () => {
  const coins = new Set([...alerts.values()].map(a => a.coin));
  for (const coin of coins) {
    const price = await fetchPrice(coin).catch(() => null);
    if (!price) continue;
    for (const [i, a] of alerts) {
      if (a.coin === coin && price >= a.target) {
        bot.sendMessage(a.chatId, `${coin.toUpperCase()} hit $${price}!`);
        alerts.delete(i);
      }
    }
  }
}, 30000);

console.log("[+] Bot started");
