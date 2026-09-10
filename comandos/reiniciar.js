export const handler = {}
handler.name = 'reiniciar'
handler.alias = ['restart','rs','reinicia']
handler.category = 'owner'
handler.owner = true

async function isOwner(m, sock) {
  try {
    const setting = await import('../setting.js').then(x=>x.default||x).catch(()=>null) || {}
    const owners = setting.owner || setting.owners || setting.ownerNumber || []
    const rawOwners = Array.isArray(owners)? owners : [owners]
    let sender = m.key.participant || m.key.remoteJid
    if (sender.includes('@lid')) {
      try {
        const contact = await sock.signalRepository?.lidMapping?.getPNForLID?.(sender) || null
        if (contact) sender = contact
      } catch {}
    }
    let num = sender.replace(/[^0-9]/g,'')
    return rawOwners.some(o => {
      let on = String(o).replace(/[^0-9]/g,'')
      return num.endsWith(on) || on.endsWith(num) || num.includes(on)
    })
  } catch { return false }
}

handler.exec = async (sock, m) => {
  const chat = m.key.remoteJid
  if (!(await isOwner(m, sock))) {
    await sock.sendMessage(chat,{text:'⛔ Solo owner'}, {quoted:m})
    return
  }
  await sock.sendMessage(chat,{text:'♻️ Reiniciando Anubis V2...\n\nEspera 3s'}, {quoted:m})

  // guarda flag para que index.js no pida opcion de nuevo
  try{
    const fs = await import('fs')
    fs.writeFileSync('./AnubisSession/restart.json', JSON.stringify({restart:true, time: Date.now()}))
  }catch{}

  setTimeout(()=>{
    process.exit(0) // el index.js lo va a reconectar solo en 3s
  }, 1500)
}
