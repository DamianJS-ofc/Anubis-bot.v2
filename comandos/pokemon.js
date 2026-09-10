import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../')
const DB = path.join(ROOT, 'database/pokemons.json')

export const handler = {}
handler.name = 'pokemon'
handler.alias = ['poke', 'wild']
handler.category = 'poke-gacha'
handler.description = 'Aparece un pokemon salvaje (fix LID)'

function clean(s){ return String(s).replace(/:\d+@/g,'@').replace(/:\d+/g,'').trim() }

function getDB(){ try{ return JSON.parse(fs.readFileSync(DB,'utf8')) }catch{ return { groups:{} } } }
function saveDB(d){
  if(!fs.existsSync(path.dirname(DB))) fs.mkdirSync(path.dirname(DB), { recursive: true })
  fs.writeFileSync(DB, JSON.stringify(d,null,2))
}
function getGroup(db,jid){
  if(!db.groups) db.groups={}
  if(!db.groups[jid]) db.groups[jid]={ users:{}, wild:null }
  return db.groups[jid]
}

handler.exec = async (sock, m) => {
  const jid = clean(m.key.remoteJid)
  const db = getDB()
  let g = getGroup(db, jid)

  let id = Math.floor(Math.random()*150)+1
  let res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(r=>r.json()).catch(()=>null)
  if(!res) return sock.sendMessage(jid, { text: '❌ Error pokeapi' }, { quoted: m })

  let name = res.name
  let types = res.types.map(t=>t.type.name).join(', ')
  let hp = res.stats[0].base_stat
  let power = res.stats[1].base_stat + res.stats[2].base_stat
  let valor = Math.floor(Math.random()*200)+50
  let img = res.sprites.other['official-artwork'].front_default || res.sprites.front_default

  g.wild = { id, name, types, hp, power, valor, img, lvl: 1, time: Date.now() }
  saveDB(db)

  let txt = `🌿 *¡SALVAJE!* ${name}\n\n| ⚡ *Tipo:* ${types}\n| ❤️ *Salut:* ${hp}%\n| 🎯 *Poder:* ${power}%\n| 🎒 *inventario:*\n| 🪙 *Valor:* ${valor}\n> 🚀 Usa.atrapar para intentar atraparlo`

  try{
    await sock.sendMessage(jid, { image: { url: img }, caption: txt }, { quoted: m })
  }catch{
    await sock.sendMessage(jid, { text: txt }, { quoted: m })
  }
}