import pino from 'pino'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../../')

const mod = await import('baileys')
const B = (mod.default && Object.keys(mod.default).length > 0)? mod.default : mod

export const handler = {}
handler.name = 'serbot'
handler.alias = ['jadibot', 'code', 'serbots']
handler.category = 'jadibot-serbot'
handler.description = 'Crea sub-bot (fix LID final)'

handler.exec = async (sock, m, extra) => {
  const jid = m.key.remoteJid
  let args = Array.isArray(extra)? extra : extra?.args || []
  if(!args.length && extra?.text) args = extra.text.split(' ')

  // === TRADUCTOR LID -> NUMERO REAL PARA EL COMANDO ===
  let rawTarget = (args[0] || '').replace(/[^0-9]/g,'')
  let senderRaw = m.key.participant || m.key.remoteJid || ''
  let senderId = senderRaw.split('@')[0]

  // si quien pide es LID, intenta traducirlo con el mapa interno del bot principal
  async function lidToPn(lid){
    if(!lid) return null
    if(!lid.includes('@lid') &&!/^\d{14,}$/.test(lid)) return lid.split('@')[0]
    try{
      // nuevo Baileys: signalRepository.lidMapping
      if(sock.signalRepository?.lidMapping){
        const pn = await sock.signalRepository.lidMapping.getPNForLID(lid.includes('@')? lid : `${lid}@lid`)
        if(pn) return pn.split('@')[0].replace(/[^0-9]/g,'')
      }
    }catch{}
    try{
      // fallback: buscar en store si existe
      if(sock.store?.contacts){
        for(const c of Object.values(sock.store.contacts)){
          if(c.lid === lid || c.id?.includes(lid)) return c.id.split('@')[0]
        }
      }
    }catch{}
    return null
  }

  let realSender = await lidToPn(senderRaw)
  if(!realSender) realSender = senderId.replace(/[^0-9]/g,'')

  // si el arg es LID o esta vacio, usamos el sender traducido
  let targetNum = rawTarget
  if(!targetNum || targetNum.length > 13 || targetNum.startsWith('1408') || targetNum.startsWith('1048') || targetNum.startsWith('1093')){
    // parece LID, lo traducimos
    const translated = await lidToPn(targetNum? `${targetNum}@lid` : senderRaw)
    if(translated) targetNum = translated
    else targetNum = realSender
  }

  // si sigue siendo LID (14 digitos que empiezan con 1), no podemos continuar
  if(targetNum.length > 13){
    await sock.sendMessage(jid, { text: `❌ Tu WhatsApp me manda LID (${targetNum}) y no tu número real.\n\nEscribí así:\n*.serbot 549223XXXXXXX*\n\nCon tu número real sin + ni espacios.` }, { quoted: m })
    return
  }

  const id = targetNum
  const folder = path.join(ROOT, `AnubisSession/Serbots/${id}`)
  if(!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true })

  const { state, saveCreds } = await B.useMultiFileAuthState(folder)
  const { version } = await B.fetchLatestBaileysVersion()

  await sock.sendMessage(jid, { text: `🔴 Creando Sub-Bot para ${id}... (real, no LID)` }, { quoted: m })

  const subSock = B.makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: B.makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    browser: ['Ubuntu','Chrome','20.0.04'],
    markOnlineOnConnect: false,
  })

  let lidMap = {}
  subSock.ev.on('lid-mapping.update', (u) => {
    try{
      if(u?.lid && u?.pn){ lidMap[u.lid]=u.pn; lidMap[u.pn]=u.lid }
      if(Array.isArray(u)){ for(const x of u){ if(x.lid && x.pn){ lidMap[x.lid]=x.pn; lidMap[x.pn]=x.lid } } }
    }catch{}
  })
  subSock.ev.on('creds.update', saveCreds)

  if(!state.creds.registered){
    await new Promise(r=>setTimeout(r, 2500))
    try{
      let code = await subSock.requestPairingCode(targetNum)
      code = code?.match(/.{1,4}/g)?.join('-') || code
      await sock.sendMessage(jid, { text: `*CÓDIGO SUB-BOT* 🔑\n\n\`${code}\`\nPara: ${targetNum}` }, { quoted: m })
    }catch(e){
      await sock.sendMessage(jid, { text: `❌ Error code para ${targetNum}: ${e.message}` }, { quoted: m })
      return
    }
  }else{
    await sock.sendMessage(jid, { text: `✅ Sub-bot ${id} ya existe, reconectando...` }, { quoted: m })
  }

  const handlerPath = path.join(ROOT, 'anubis-nucleo/handler.js')
  const { loadPlugins, handler: mainHandler } = await import(`file://${handlerPath}?update=${Date.now()}`)
  await loadPlugins()

  subSock.ev.on('messages.upsert', async ({ messages }) => {
    let msg = messages[0]; if(!msg?.message) return
    if(msg.key.remoteJid?.includes('@lid') && lidMap[msg.key.remoteJid]) msg.key.remoteJid = lidMap[msg.key.remoteJid]
    if(msg.key.participant?.includes('@lid') && lidMap[msg.key.participant]) msg.key.participant = lidMap[msg.key.participant]
    try{ await mainHandler(subSock, msg, true) }catch{}
  })
}
