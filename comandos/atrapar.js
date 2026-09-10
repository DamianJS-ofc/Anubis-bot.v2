import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../')
const DB = path.join(ROOT, 'database/pokemons.json')

export const handler = {}
handler.name = 'atrapar'
handler.alias = ['catch', 'atraparpoke']
handler.category = 'poke-gacha'
handler.description = 'Atrapa al salvaje (fix LID)'

function clean(s){ return String(s).replace(/:\d+@/g,'@').replace(/:\d+/g,'').trim() }

async function getRealJid(sock, raw){
  raw = clean(raw)
  if(!raw.includes('@lid')) return raw
  try{
    if(sock.signalRepository?.lidMapping?.getPNForLID){
      const pn = await sock.signalRepository.lidMapping.getPNForLID(raw)
      if(pn) return clean(pn)
    }
  }catch{}
  try{
    if(sock.signalRepository?.lidMapping?.getPNForLID){
      const pn = await sock.signalRepository.lidMapping.getPNForLID(raw.includes('@')? raw : `${raw}@lid`)
      if(pn) return clean(pn)
    }
  }catch{}
  return raw
}

function getDB(){
  try{ return JSON.parse(fs.readFileSync(DB, 'utf8')) }catch{ return { groups:{} } }
}
function saveDB(d){
  if(!fs.existsSync(path.dirname(DB))) fs.mkdirSync(path.dirname(DB), { recursive: true })
  fs.writeFileSync(DB, JSON.stringify(d, null, 2))
}
function getGroup(db, jid){
  if(!db.groups) db.groups={}
  if(!db.groups[jid]) db.groups[jid]={ users:{}, wild:null }
  return db.groups[jid]
}

handler.exec = async (sock, m, extra) => {
  const jid = clean(m.key.remoteJid)

  // FIX LID
  let rawUser = m.key.participant || m.key.remoteJid
  let user = await getRealJid(sock, rawUser)

  const db = getDB()
  let g = getGroup(db, jid)

  if(!g.wild){
    return sock.sendMessage(jid, { text: `🔍 No hay pokemon salvaje, usa.pokemon` }, { quoted: m })
  }

  if(!g.users[user]) g.users[user] = { balls: 15, coins: 200, pokes: [], name: clean(m.pushName) || 'Entrenador' }
  if(m.pushName) g.users[user].name = clean(m.pushName)

  let wild = g.wild
  g.users[user].pokes.push({ id: wild.id, name: wild.name, lvl: 1, power: wild.power, atrapado: Date.now() })
  g.wild = null
  saveDB(db)

  await sock.sendMessage(jid, {
    text: `🚀 *Pokemon reclamado*\n\n🎉 Atrapaste a *${wild.name}*!\n👤 Entrenador: @${user.split('@')[0]}`,
    mentions: [user]
  }, { quoted: m })
}
