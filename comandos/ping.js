export const handler = {}
handler.name = 'ping'
handler.alias = ['p', 'speed']
handler.category = 'general'
handler.description = 'Latencia del bot'

handler.exec = async (sock, m) => {
  const chat = m.key.remoteJid
  let start = Date.now()
  let msg = await sock.sendMessage(chat, { text: '🏓 *Pingueando núcleo...*' }, { quoted: m })
  let end = Date.now()
  let latency = end - start
  await sock.sendMessage(chat, {
    text: `*╭─ PING ─╮*\n*│* 🚀 Latencia: ${latency}ms\n*│* 🔴 Núcleo: Activo\n*╰─────────╯*`,
    edit: msg.key
  })
}
