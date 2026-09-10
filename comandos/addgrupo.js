export const handler = {}
handler.name = 'addgrupo'
handler.alias = ['addgroup']
handler.category = 'jadibot-serbot'
handler.description = 'Agrega el grupo a la lista donde el bot SI responde'

handler.exec = async (sock, m) => {
  const fs = await import('fs')
  let chat = m.key.remoteJid
  if (!chat.endsWith('@g.us')) return sock.sendMessage(chat, { text: '❌ Solo en grupos' }, { quoted: m })
  let db = []
  try { db = JSON.parse(fs.readFileSync('./Lib/activos/grupos.json')) } catch { db = [] }
  if (db.includes(chat)) return sock.sendMessage(chat, { text: '⚠️ Este grupo ya está activo, el bot ya responde aquí' }, { quoted: m })
  db.push(chat)
  fs.writeFileSync('./Lib/activos/grupos.json', JSON.stringify(db, null, 2))
  await sock.sendMessage(chat, { text: '✅ *Grupo activado*\nAhora el bot SÍ responderá aquí. Está apagado en los demás.' }, { quoted: m })
}
