import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../')
const DB = path.join(ROOT, 'database/pokemons.json')

export const handler = {}
handler.name = 'balls'
handler.alias = ['ball', 'mochila', 'bag']
handler.category = 'poke-gacha'
handler.description = 'Ver tus balls y coins (fix LID)'

function clean(s){ return String(s).replace(/:\d+@/g,'@').replace(/:\d+/g,'').trim() }

async function getRealJid(sock, raw){
  raw = clean(raw)
  if(!raw.includes('@lid')) return raw
  try{
    const pn = await sock.signalRepository?.lidMapping?.getPNForLID?.(raw)
    if(pn && String(pn).includes('@')) return clean(pn)
  }catch{}
  try{
    const pn = await sock.signalRepository?.lidMapping?.getPNForLID?.(raw.includes('@')? raw : `${raw}@lid`)
    if(pn && String(pn).includes('@')) return clean(pn)
  }catch{}
  return raw
}

function getDB(){
  try{
    let d = JSON.parse(fs.readFileSync(DB,'utf8'))
    if(!d.groups) d = { groups: d.groups||{}, lidMap: d.lidMap||{},...d }
    if(!d.groups) d.groups={}
    if(!d.lidMap) d.lidMap={}
    return d
  }catch{ return { groups:{}, lidMap:{} } }
}
function getGroup(db,jid){
  if(!db.groups) db.groups={}
  if(!db.groups[jid]) db.groups[jid]={ users:{}, wild:null }
  return db.groups[jid]
}

handler.exec = async (sock, m) => {
  const jid = clean(m.key.remoteJid)
  let raw = String(m.key.participant || m.key.remoteJid)
  let user = await getRealJid(sock, raw)

  const db = getDB()
  let g = getGroup(db, jid)

  if(!g.users[user]){
    // si lo tenia guardado con LID viejo, migralo
    if(g.users[raw] && raw!==user){
      g.users[user] = g.users[raw]
      delete g.users[raw]
    } else {
      g.users[user] = { balls: 15, coins: 200, pokes: [], num: user.split('@')[0] }
    }
    try{ fs.writeFileSync(DB, JSON.stringify(db,null,2)) }catch{}
  }

  let u = g.users[user]
  let name = clean(m.pushName) || user.split('@')[0]

  await sock.sendMessage(jid, {
    text: `🎒 *TUS BALLS*\n\n👤 @${user.split('@')[0]} (${name})\n⚪ Pokeballs: ${u.balls}\n🟡 Coins: ${u.coins}\n📦 Pokemons: ${u.pokes?.length||0}`,
    mentions: [user]
  }, { quoted: m })
}
