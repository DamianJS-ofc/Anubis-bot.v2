export const handler = {}
handler.name = 'addco'
handler.alias = ['addstickercmd']
handler.category = 'admin'
handler.description = 'Añade un sticker con comando: responde a un sticker con.addco <comando>'
handler.exec = async (sock, m, args) => {
  const fs = await import('fs')
  let quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage
  if (!quoted) return sock.sendMessage(m.key.remoteJid, { text: '❌ Responde a un sticker con.addco <nombre_comando>\nEj:.addco menu' }, { quoted: m })
  if (!args[0]) return sock.sendMessage(m.key.remoteJid, { text: '❌ Pon el comando que ejecutará ese sticker\nEj:.addco menu' }, { quoted: m })
  let sha = quoted.fileSha256?.toString('hex') || quoted.fileEncSha256?.toString('hex') || Buffer.from(quoted.fileSha256 || []).toString('hex')
  if (!sha) sha = Date.now().toString()
  let db = {}; try { db = JSON.parse(fs.readFileSync('./Lib/activos/co.json')) } catch { db = {} }
  db[sha] = { comando: args[0].replace('.',''), creator: m.key.remoteJid }
  fs.writeFileSync('./Lib/activos/co.json', JSON.stringify(db, null, 2))
  await sock.sendMessage(m.key.remoteJid, { text: `✅ Co guardado\nSticker =>.${args[0]}` }, { quoted: m })
}
