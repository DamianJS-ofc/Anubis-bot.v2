import fs from 'fs'
import path from 'path'

export const handler = {}
handler.name = 'newcomando'
handler.alias = ['newcmd','crearcomando']
handler.category = 'owner'
handler.owner = true

async function isOwner(m, sock){
  try{
    const setting = await import('../setting.js').then(x=>x.default||x).catch(()=>null) || {}
    const owners = setting.owner || setting.owners || setting.ownerNumber || []
    const raw = Array.isArray(owners)?owners:[owners]
    let sender = m.key.participant || m.key.remoteJid
    if(sender.includes('@lid')){
      try{
        const pn = await sock.signalRepository?.lidMapping?.getPNForLID?.(sender)
        if(pn) sender = pn
      }catch{}
    }
    let num = sender.replace(/[^0-9]/g,'')
    return raw.some(o=>{
      let on = String(o).replace(/[^0-9]/g,'')
      return num.endsWith(on) || on.endsWith(num) || num.includes(on)
    })
  }catch{return false}
}

handler.exec = async (sock, m, args) => {
  const chat = m.key.remoteJid
  if(!(await isOwner(m,sock))){
    await sock.sendMessage(chat,{text:'⛔ Solo owner papu'}, {quoted:m})
    return
  }

  // codigo puede venir respondiendo a un mensaje
  let quotedCode = ''
  try{
    if(m.message?.extendedTextMessage?.contextInfo?.quotedMessage){
      quotedCode = m.message.extendedTextMessage.contextInfo.quotedMessage.conversation || m.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text || ''
    }
  }catch{}

  let fileName = args[0]?.trim()
  if(!fileName){
    await sock.sendMessage(chat,{text:`📌 Uso:.newcomando <nombre> (respondiendo al codigo)\nEj:.newcomando kick\n\nEl archivo se crea en comandos/<nombre>.js`},{quoted:m})
    return
  }

  if(!fileName.endsWith('.js')) fileName = fileName+'.js'
  fileName = fileName.replace(/[^a-zA-Z0-9._-]/g,'') // anti path traversal

  let code = quotedCode
  // si escribieron el codigo despues del nombre con |
  if(args.length>1){
    let rest = args.slice(1).join(' ')
    if(rest.includes('|')) code = rest.split('|').slice(1).join('|')
    else if(!code) code = rest
  }

  if(!code){
    // plantilla base si no respondio a nada
    code = `export const handler = {}
handler.name = '${fileName.replace('.js','')}'
handler.alias = []
handler.category = 'general'
handler.desc = 'Nuevo comando'

handler.exec = async (sock, m, args) => {
  const chat = m.key.remoteJid
  await sock.sendMessage(chat, { text: '✅ Comando ${fileName.replace('.js','')} funcionando papu' }, { quoted: m })
}
`
  }

  const fullPath = path.resolve('./comandos', fileName)
  // seguridad: solo dentro de comandos, no subcarpetas
  if(!fullPath.startsWith(path.resolve('./comandos'))){
    await sock.sendMessage(chat,{text:'⛔ Solo en carpeta comandos'}, {quoted:m})
    return
  }

  // crear backup si ya existe
  if(fs.existsSync(fullPath)){
    let bak = fullPath+'.bak-'+Date.now()
    fs.copyFileSync(fullPath, bak)
  }

  fs.writeFileSync(fullPath, code)
  await sock.sendMessage(chat,{text:`✅ Comando creado: comandos/${fileName}\n\n📝 ${code.length} chars`},{quoted:m})

  try{
    const { loadPlugins } = await import('../anubis-nucleo/handler.js')
    await loadPlugins()
    await sock.sendMessage(chat,{text:`🔄 Plugins recargados - prueba.${fileName.replace('.js','')}`},{quoted:m})
  }catch(e){
    await sock.sendMessage(chat,{text:`⚠️ Creado pero no se pudo recargar: ${e.message}`},{quoted:m})
  }
}
