import fs from 'fs'
import path from 'path'
import chalk from 'chalk'

let plugins = new Map()
let coDB = {}
let toxicWords = ['puta','puto','mrd','ctm','verga','mierda','pene','chucha','kys','polla']

export async function loadPlugins() {
  plugins.clear()
  const base = path.resolve('./comandos')
  async function loadRec(dir) {
    if (!fs.existsSync(dir)) {
      console.log(chalk.red(`No existe carpeta ${dir}`))
      return
    }
    for (let f of fs.readdirSync(dir)) {
      let full = path.join(dir, f)
      if (fs.statSync(full).isDirectory()) await loadRec(full)
      else if (f.endsWith('.js')) {
        try {
          let mod = await import(`file://${full}?update=${Date.now()}`)
          if (mod.handler?.name) {
            let h = mod.handler
            console.log(`Cargado: ${h.name} | alias: ${h.alias || 'sin alias'} | archivo: ${f}`)
            plugins.set(h.name.toLowerCase(), h)
            if (h.alias) for (let a of h.alias) plugins.set(a.toLowerCase().replace('.',''), h)
          } else {
            console.log(chalk.yellow(`Archivo sin handler.name: ${f}`))
          }
        } catch(e){ console.log(chalk.red(`Error ${f}: ${e.message}`)) }
      }
    }
  }
  await loadRec(base)
  try { coDB = JSON.parse(fs.readFileSync('./Lib/activos/co.json','utf-8')) } catch { coDB = {} }
  console.log(chalk.green(`✅ ${plugins.size} comandos | keys: [${[...plugins.keys()].slice(0,20).join(', ')}] | ${Object.keys(coDB).length} co`))
}

function isLink(text) {
  const regex = /(https?:\/\/|www\.|chat\.whatsapp\.com|whatsapp\.com\/channel|t\.me)/i
  return regex.test(text||'')
}

export async function handleParticipants(sock, update) {
  try {
    let id = update.id
    let welcomeDB = {}; try { welcomeDB = JSON.parse(fs.readFileSync('./Lib/activos/welcome.json')) } catch {}
    if (!welcomeDB[id]) return
    for (let user of update.participants) {
      let pp = ''; try { pp = await sock.profilePictureUrl(user, 'image') } catch { pp = 'https://i.imgur.com/2s9bX2e.jpeg' }
      if (update.action === 'add') {
        await sock.sendMessage(id, { image: { url: pp }, caption: `🎋 BIENVENIDO @${user.split('@')[0]}`, mentions: [user] })
      }
    }
  } catch {}
}

export async function handler(sock, m, isSubBot = false) {
  try {
    let chat = m.key.remoteJid
    let isGroup = chat.endsWith('@g.us')
    let sender = m.key.participant || m.key.remoteJid
    let text = m.message?.conversation || m.message?.extendedTextMessage?.text || m.message?.imageMessage?.caption || ''
    let isSticker =!!m.message?.stickerMessage

    if (isSubBot && isGroup) {
      let grupos = []; try { grupos = JSON.parse(fs.readFileSync('./Lib/activos/grupos.json')) } catch {}
      const siempre = ['addgrupo','addgroup','delgrupo','delgroup','menu','help','ping']
      if (!grupos.includes(chat)) {
        if (text.startsWith('.')) {
          let cmd = text.slice(1).trim().split(' ')[0].toLowerCase()
          if (!siempre.includes(cmd)) return
        } else {
          return
        }
      }
    }

    if (isSticker) {
      try {
        let sha = m.message.stickerMessage.fileSha256?.toString('hex')
        try { coDB = JSON.parse(fs.readFileSync('./Lib/activos/co.json')) } catch {}
        if (coDB[sha]) {
          let plugin = plugins.get(coDB[sha].comando.toLowerCase())
          if (plugin) await plugin.exec(sock, m, [], { plugins })
          return
        }
      } catch {}
    }

    if (isGroup && isLink(text)) {
      let antilinkDB = {}; try { antilinkDB = JSON.parse(fs.readFileSync('./Lib/activos/antilink.json')) } catch {}
      if (antilinkDB[chat]) {
        let meta = await sock.groupMetadata(chat)
        let admins = meta.participants.filter(p=>p.admin).map(p=>p.id)
        if (!admins.includes(sender) && (admins.includes(sock.user.id) || admins.includes(sock.user.id.split(':')[0]+'@s.whatsapp.net'))) {
          await sock.sendMessage(chat, { delete: m.key })
          return
        }
      }
    }

    if (isGroup && text) {
      let antitoxicDB = {}; try { antitoxicDB = JSON.parse(fs.readFileSync('./Lib/activos/antitoxic.json')) } catch {}
      if (antitoxicDB[chat] && toxicWords.some(w=>text.toLowerCase().includes(w))) {
        let meta = await sock.groupMetadata(chat)
        let admins = meta.participants.filter(p=>p.admin).map(p=>p.id)
        if (!admins.includes(sender)) {
          await sock.sendMessage(chat, { delete: m.key })
          return
        }
      }
    }

    if (!text.startsWith('.')) return
    let parts = text.slice(1).trim().split(' ')
    let cmdName = parts[0].toLowerCase()
    let args = parts.slice(1)

    console.log(`📩 Llegó:.${cmdName} | plugins tiene ${plugins.size} keys | existe? ${plugins.has(cmdName)}`)
    if (plugins.size > 0 &&!plugins.has(cmdName)) {
      console.log(`Keys disponibles: ${[...plugins.keys()].join(', ')}`)
    }

    let plugin = plugins.get(cmdName)
    if (!plugin) {
      console.log(`❌ Comando no encontrado: ${cmdName}`)
      return
    }
    console.log(`✅ Ejecutando: ${cmdName} en ${isGroup? 'GRUPO' : 'PRIV'} ${chat}`)
    try {
      await plugin.exec(sock, m, args, { plugins, isSubBot })
    } catch(e) {
      console.log(`💥 Error en ${cmdName}:`, e.message)
      console.log(e.stack)
      try { await sock.sendMessage(chat, { text: `💥 Error en ${cmdName}: ${e.message}` }) } catch {}
    }
  } catch(e) {
    console.log('💥 Error handler global:', e.message)
  }
          }
