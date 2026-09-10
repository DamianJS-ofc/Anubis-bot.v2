export const handler = {}
handler.name = 'antitoxic'
handler.alias = ['antitox']
handler.category = 'admin'
handler.description = 'Activa antitoxic on/off'
handler.exec = async (sock, m, args) => {
  const fs = await import('fs')
  let db = {}; try { db = JSON.parse(fs.readFileSync('./Lib/activos/antitoxic.json')) } catch { db = {} }
  let chat = m.key.remoteJid
  if (args[0] === 'on') { db[chat]=true; fs.writeFileSync('./Lib/activos/antitoxic.json', JSON.stringify(db)); await sock.sendMessage(chat, { text: '🤬 Antitoxic activado' }, { quoted: m }) }
  else { delete db[chat]; fs.writeFileSync('./Lib/activos/antitoxic.json', JSON.stringify(db)); await sock.sendMessage(chat, { text: '🤬 Antitoxic desactivado' }, { quoted: m }) }
}
