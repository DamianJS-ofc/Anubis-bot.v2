import util from 'util'

export const handler = {}
handler.name = 'eval'
handler.alias = ['ev','>>']
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

handler.exec = async (sock, m, args) => {
  const chat = m.key.remoteJid
  if (!(await isOwner(m, sock))) {
    await sock.sendMessage(chat,{text:'⛔ Solo owner'},{quoted:m})
    return
  }
  let code = args.join(' ').trim()
  try{
    if(!code && m.message?.extendedTextMessage?.contextInfo?.quotedMessage){
      let q = m.message.extendedTextMessage.contextInfo.quotedMessage
      code = q.conversation || q.extendedTextMessage?.text || ''
    }
  }catch{}
  if(!code){ await sock.sendMessage(chat,{text:'📌 Uso:.eval 2+2'},{quoted:m}); return }
  try{
    let result = await eval(`(async()=>{ ${code.includes('return')||code.includes('await')?code:`return ${code}`} })()`)
    let out = typeof result === 'string'? result : util.inspect(result, {depth:2})
    await sock.sendMessage(chat,{text:`🧪 EVAL\n📥 ${code.slice(0,500)}\n\n📤 ${String(out).slice(0,3500)}`},{quoted:m})
  }catch(e){
    await sock.sendMessage(chat,{text:`❌ ${e.message}`},{quoted:m})
  }
}
