import mineflayer from 'mineflayer';

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 25565,
  username: 'Bot',
  // auth: 'microsoft' // Bỏ comment nếu dùng tài khoản Microsoft
});

bot.on('spawn', () => {
  console.log('Bot đã spawn vào server!');
  bot.chat('Xin chào! Tôi là bot Minecraft.');
});

bot.on('chat', (username, message) => {
  if (username === bot.username) return;
  
  console.log(`${username}: ${message}`);
  
  if (message === 'hi') {
    bot.chat(`Xin chào ${username}!`);
  }
});

bot.on('error', (err) => {
  console.error('Lỗi:', err);
});

bot.on('kicked', (reason) => {
  console.log('Bot bị kick:', reason);
});

bot.on('end', () => {
  console.log('Bot đã ngắt kết nối');
});