import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../')

export const handler = {}
handler.name = 'delfile'
handler.alias = ['delplugin', 'borrarfile', 'deletefile']
handler.category = 'owner'
handler.description = 'Borra un archivo (fix LID)'

async function lidToPn(sock, jidRaw){
  const s = String(jidRaw||'')
  if(!s.includes('@lid')) return s
  try{
    const pn = await sock.signalRepository?.lidMapping?.getPNForLID?.(s)
    if(pn) return String(pn)
  }catch{}
  return s
}

function isOwner(m, settings, realJid){
  const p = String(realJid||'')
  const num = p.replace(/[^0-9]/g,'')
  const owners = settings?.owner || settings?.ownerNumber || global.owner || []
  if(!owners.length) return true
  return owners.some(o=>{
    const oc = String(o).replace(/[^0-9]/g,'')
    return p.includes(o) || num.includes(oc) || oc.includes(num)
  }) || m.key.fromMe
}

handler.exec = async (sock, m, { args, settings }) => {
  const jid = m.key.remoteJid
  const raw = m.key.participant || m.key.remoteJid
  const realJid = await lidToPn(sock, raw)

  if(!isOwner(m, settings, realJid)){
    return sock.sendMessage(jid, { text: '❌ Solo owner' }, { quoted: m })
  }

  if(!args[0]){
    return sock.sendMessage(jid, { text: '❌ Usa:\n.delfile comandos/nombre.js\nEj:\n.delfile comandos/abrir grupo.js' }, { quoted: m })
  }

  const ruta = args.join(' ').trim()
  const fullPath = path.resolve(ROOT, ruta)

  if(fullPath.includes('node_modules') || fullPath.includes('AnubisSession') || fullPath.includes('database') || fullPath.endsWith('settings.js')){
    return sock.sendMessage(jid, { text: `❌ No puedes borrar eso: ${ruta}` }, { quoted: m })
  }
  if(!fs.existsSync(fullPath)){
    return sock.sendMessage(jid, { text: `❌ No existe: ${ruta}\nRuta full: ${fullPath}` }, { quoted: m })
  }

  try{
    const stat = fs.statSync(fullPath)
    if(stat.isDirectory()) return sock.sendMessage(jid, { text: `❌ Es carpeta: ${ruta}` }, { quoted: m })
    fs.unlinkSync(fullPath)
    await sock.sendMessage(jid, { text: `✅ Borrado: ${ruta}` }, { quoted: m })
    await sock.sendMessage(jid, { react: { text: '🗑️', key: m.key } })
  }catch(e){
    await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: m })
  }
}
