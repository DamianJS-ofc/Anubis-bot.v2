export const handler = {}
handler.name = 'antilink'
handler.alias = ['antienlace']
handler.category = 'admin'
handler.description = 'Activa antilink on/off'

handler.exec = async (sock, m, args) => {
  const fs = await import('fs')
  let db = JSON.parse(fs.readFileSync('./Lib/activos/antilink.json') || '{}')
  let chat = m.key.remoteJid
  if (args[0] === 'on') {
    db[chat] = true
    fs.writeFileSync('./Lib/activos/antilink.json', JSON.stringify(db))
    await sock.sendMessage(chat, { text: '🛡️ Antilink activado' }, { quoted: m })
  } else if (args[0] === 'off') {
    delete db[chat]
    fs.writeFileSync('./Lib/activos/antilink.json', JSON.stringify(db))
    await sock.sendMessage(chat, { text: '🛡️ Antilink desactivado' }, { quoted: m })
  } else {
    await sock.sendMessage(chat, { text: 'Usa:.antilink on / off' }, { quoted: m })
  }
}
