import { exec } from 'child_process'
import util from 'util'
const execPromise = util.promisify(exec)

export const handler = {}
handler.name = 'r'
handler.alias = ['exec','$','>']
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
    await sock.sendMessage(chat,{text:'⛔ Solo owner'}, {quoted:m})
    return
  }
  let cmd = args.join(' ').trim()
  if(!cmd){ await sock.sendMessage(chat,{text:'📌 Uso:.r ls -la'},{quoted:m}); return }
  try{
    const { stdout, stderr } = await execPromise(cmd, { timeout: 15000, cwd: process.cwd() })
    await sock.sendMessage(chat,{text:`💻 $ ${cmd}\n\n${(stdout||stderr||'ok').slice(0,3500)}`},{quoted:m})
  }catch(e){
    await sock.sendMessage(chat,{text:`❌ $ ${cmd}\n\n${(e.stdout||e.stderr||e.message).slice(0,3500)}`},{quoted:m})
  }
}
