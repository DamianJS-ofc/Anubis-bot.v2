import fs from 'fs'
import path from 'path'
import setting from '../setting.js'

export const handler = {}
handler.name = 'menu'
handler.alias = ['help', 'comandos', 'allmenu']
handler.category = 'general'
handler.description = 'Muestra todos los comandos'

const settings = {
  botName: setting.botName || 'Anubis V2',
  botType: setting.botType || 'V2',
  banner: setting.banner || setting.bannerUrl || setting.imagen || null,
  channelName: setting.channelName || 'Anubis bot V2',
  channelId: setting.channelId || '120363425415754278@newsletter',
  channelLink: setting.channelLink || setting.channel || 'https://whatsapp.com/channel/0029Vb7vqNDCsU9MnOn8UN0U',
  web: setting.web || 'anubissuport.netlify.app'
}

async function fetchBuffer(url){
  if(!url) return null
  try{
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if(!r.ok) return null
    const ab = await r.arrayBuffer()
    if(!ab || ab.byteLength < 100) return null
    return Buffer.from(ab)
  }catch{ return null }
}

function getAllJSFiles(dir){
  let res=[]
  if(!fs.existsSync(dir)) return res
  for(const f of fs.readdirSync(dir)){
    const fp=path.join(dir,f)
    try{
      const s=fs.statSync(fp)
      if(s.isDirectory()) res=res.concat(getAllJSFiles(fp))
      else if(f.endsWith('.js')) res.push(fp)
    }catch{}
  }
  return res
}
function extractNameAndCat(fp){
 try{
  const c=fs.readFileSync(fp,'utf8')
  const n=c.match(/handler\.name\s*=\s*['"`]([^'"`]+)['"`]/)
  const cat=c.match(/handler\.category\s*=\s*['"`]([^'"`]+)['"`]/)
  const desc=c.match(/handler\.description\s*=\s*['"`]([^'"`]+)['"`]/)
  const al=c.match(/handler\.alias\s*=\s*\[([^\]]+)\]/)
  if(!n) return null
  let alias=[]; if(al) alias=al[1].split(',').map(a=>a.replace(/['"`\s\.]/g,'')).filter(Boolean)
  let catV=cat?cat[1]:'OTROS'
  return { name: n[1].trim(), cat: catV.toUpperCase(), desc: desc?desc[1]:'Sin descripcion', alias }
 }catch{ return null }
}

handler.exec = async (sock, m) => {
  const jid=m.key.remoteJid
  try{
    const files=getAllJSFiles(path.join(process.cwd(),'comandos'))
    const cats={}; const vistos=new Set()
    for(const file of files){
     const data=extractNameAndCat(file); if(!data) continue
     if(vistos.has(data.name.toLowerCase())) continue
     vistos.add(data.name.toLowerCase())
     const k=data.cat.toLowerCase()
     if(!cats[k]) cats[k]=[]
     cats[k].push(data)
    }
    const total=vistos.size
    let txt = `> Hola @${(m.pushName||'Anubis').replace(/[^a-zA-Z0-9 ]/g,'')} soy *${settings.botName} ${settings.botType}* aqui tienes la lista de ${total} comandos\n`
    txt+=`┌───────────\n│ Powered by DamianJS\n│ Web: ${settings.web}\n│ Channel: ${settings.channelLink}\n└───────────\n\n`
    for(const k of Object.keys(cats).sort()){
     txt+=`*『${k.toUpperCase()}』*\n`
     for(const cmd of cats[k].sort((a,b)=>a.name.localeCompare(b.name))){
      const aliasText=cmd.alias.length?` (${cmd.alias.join(', ')})`:''
      txt+=`🎮 ${cmd.name}${aliasText}\n> ${cmd.desc}\n`
     }
     txt+=`\n`
    }

    const ctx = {
      mentionedJid: [m.key.participant || jid],
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: settings.channelId,
        newsletterName: settings.channelName,
        serverMessageId: 1
      }
    }

    // Con banner de setting.js
    if(settings.banner){
      const buff = await fetchBuffer(settings.banner)
      if(buff){
        await sock.sendMessage(jid, { image: buff, caption: txt, contextInfo: ctx }, { quoted: m })
        return
      }
    }

    // Sin banner fallback seguro
    await sock.sendMessage(jid, { text: txt, contextInfo: ctx }, { quoted: m })

  }catch(e){
    console.log(e)
    await sock.sendMessage(jid, { text: `Error menu: ${e.message}` }, { quoted: m })
  }
}
