export const handler = {}
handler.name = 'delgrupo'
handler.alias = ['delgroup']
handler.category = 'jadibot-serbot'
handler.description = 'Apaga el bot en este grupo'

handler.exec = async (sock, m) => {
  const fs = await import('fs')
  let chat = m.key.remoteJid
  let db = JSON.parse(fs.readFileSync('./Lib/activos/grupos.json') || '[]')
  let newDb = db.filter(g => g!== chat)
  fs.writeFileSync('./Lib/activos/grupos.json', JSON.stringify(newDb, null, 2))
  await sock.sendMessage(chat, { text: '🔴 *Grupo desactivado*\nEl bot ya NO responderá aquí. Quedó apagado.' }, { quoted: m })
}
