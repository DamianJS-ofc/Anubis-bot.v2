import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../')

export const handler = {}
handler.name = 'savefile'
handler.alias = ['svfile', 'guardar', 'save']
handler.category = 'owner'
handler.description = 'Guarda archivo respondiendo a un codigo'

function getQuoted(m){
  if(m.quoted?.message) return m.quoted.message
  if(m.quoted) return m.quoted
  let msg = m.message
  if(!msg) return null
  if(msg.ephemeralMessage) msg = msg.ephemeralMessage.message
  if(msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message
  const ctx = msg.extendedTextMessage?.contextInfo || msg.imageMessage?.contextInfo || msg.videoMessage?.contextInfo || {}
  return ctx.quotedMessage || null
}

handler.exec = async (sock, m, extra) => {
  const jid = m.key.remoteJid

  // SOPORTA TODOS LOS FORMATOS DE ARGS DE V2
  let args = []
  let text = ''
  if(Array.isArray(extra)) args = extra
  else if(extra?.args) args = extra.args
  else if(typeof extra === 'string') { text = extra; args = extra.split(' ') }
  else if(extra?.text) { text = extra.text; args = extra.text.split(' ').slice(1) }

  // Si escribis .savefile comandos/x.js el handler ya te saca el comando, args debe tener ruta
  const ruta = args.join(' ').trim() || text.replace(/^\S+\s*/,'').trim()

  if(!ruta){
    return sock.sendMessage(jid, { text: `❌ Uso: .savefile comandos/archivo.js\nArgs detectados: [${args.join(',')}] extra type: ${typeof extra}` }, { quoted: m })
  }

  const quoted = getQuoted(m)
  if(!quoted){
    return sock.sendMessage(jid, { text: `❌ Responde al mensaje con el código` }, { quoted: m })
  }

  try{
    const filePath = path.join(ROOT, ruta)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })

    let codigo = ''
    if(quoted.documentMessage || quoted.documentWithCaptionMessage){
      const docMsg = quoted.documentWithCaptionMessage ? quoted.documentWithCaptionMessage.message.documentMessage : quoted.documentMessage
      const { downloadMediaMessage } = await import('baileys/lib/Utils/messages.js')
      const buffer = await downloadMediaMessage({ message: { documentMessage: docMsg } }, 'buffer', {}, { logger: { level:'silent' }, reuploadRequest: sock.updateMediaMessage })
      codigo = buffer.toString('utf-8')
    }else{
      codigo = quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || quoted.videoMessage?.caption || quoted.documentMessage?.caption || ''
      codigo = codigo.replace(/^```(js|javascript)?\n?/i,'').replace(/```$/,'').trim()
    }

    if(!codigo) return sock.sendMessage(jid, { text: `❌ Vacio` }, { quoted: m })

    fs.writeFileSync(filePath, codigo, 'utf8')
    await sock.sendMessage(jid, { text: `✅ GUARDADO\n📁 ${ruta}\n📏 ${codigo.length} bytes` }, { quoted: m })
  }catch(e){
    await sock.sendMessage(jid, { text: `❌ ${e.message}` }, { quoted: m })
  }
}
