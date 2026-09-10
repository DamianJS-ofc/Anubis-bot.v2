export const handler = {}
handler.name = 'delco'
handler.alias = ['delstickercmd']
handler.category = 'admin'
handler.description = 'Elimina un sticker co'
handler.exec = async (sock, m, args) => {
  const fs = await import('fs')
  let quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage
  if (!quoted) return sock.sendMessage(m.key.remoteJid, { text: '❌ Responde al sticker que quieres borrar con.delco' }, { quoted: m })
  let sha = quoted.fileSha256?.toString('hex') || quoted.fileEncSha256?.toString('hex') || Buffer.from(quoted.fileSha256 || []).toString('hex')
  let db = {}; try { db = JSON.parse(fs.readFileSync('./Lib/activos/co.json')) } catch { db = {} }
  if (db[sha]) { delete db[sha]; fs.writeFileSync('./Lib/activos/co.json', JSON.stringify(db, null, 2)); await sock.sendMessage(m.key.remoteJid, { text: '🗑️ Co eliminado, ya no responderá a ese sticker' }, { quoted: m }) }
  else { await sock.sendMessage(m.key.remoteJid, { text: '❌ Ese sticker no tiene comando' }, { quoted: m }) }
}
