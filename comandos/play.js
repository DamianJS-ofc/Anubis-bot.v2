import ytSearch from 'yt-search'
import setting from '../setting.js'

const KEY_SEARCH = 'lem_304ce5dc0bf924aedbeb0cd0482b5e3565e8b5f0'
const KEY_DL = 'Anubis_bott_pro'
const BASE = 'https://api.lempi.lat'

export const handler = {}
handler.name = 'play'
handler.alias = ['ytmp3', 'mp3']
handler.category = 'Descargas'
handler.description = 'Descarga musica de YouTube'

handler.exec = async (sock, m, extra) => {
  const jid = m.key.remoteJid
  // FIX para que soporte ambas V2: (args) o ({args})
  let args = []
  if (Array.isArray(extra)) args = extra
  else if (extra?.args) args = extra.args
  else if (extra?.text) args = extra.text.split(' ')
  
  const q = args.join(' ').trim()
  if(!q) return sock.sendMessage(jid, { text: '❌ Usa: .play dalex hola' }, { quoted: m })
  await sock.sendMessage(jid, { react: { text: '🎧', key: m.key } })
  try{
    let videoUrl = q
    let titleSearch = q
    let videoInfo = null
    if(!q.startsWith('http')){
      try{
        const s = await fetch(`${BASE}/s/youtube?query=${encodeURIComponent(q)}&apikey=${KEY_SEARCH}`).then(r=>r.json())
        const first = (s.result || s.data || [])[0]
        if(first?.url){
          videoUrl = first.url
          titleSearch = first.title || q
          videoInfo = first
        }else throw new Error('no url')
      }catch{
        const r = await ytSearch(q)
        if(!r.videos[0]) throw new Error('No se encontro')
        videoUrl = r.videos[0].url
        titleSearch = r.videos[0].title
        videoInfo = r.videos[0]
      }
    }
    const dl = await fetch(`${BASE}/dl/yta?url=${encodeURIComponent(videoUrl)}&apikey=${KEY_DL}`).then(r=>r.json())
    const audioUrl = dl.datos?.url || dl.url
    const title = dl.titulo || videoInfo?.title || titleSearch
    const thumb = dl.miniatura || videoInfo?.thumbnail || null
    const duration = dl.duracion || videoInfo?.timestamp || 'Desconocido'
    const views = videoInfo?.views ? videoInfo.views.toLocaleString() : 'Desconocido'
    const likes = videoInfo?.likes ? videoInfo.likes.toLocaleString() : 'Desconocido'
    const author = videoInfo?.author?.name || dl.autor || 'YouTube'
    if(!audioUrl) throw new Error('API vacia')
    let txt = `▛▔▔▔▔▔▔▔▔▔▔▔▔▔▜\n`
    txt += `┊      *🎮 ${setting.botName || 'Anubis V2'} 🎮*\n`
    txt += `┊   📥 *DESCARGANDO*\n`
    txt += `▙▁▁▁▁▁▁▁▁▁▟\n\n`
    txt += `🎧 *${title}*\n\n`
    txt += `┊  🎋 ⌈ Canal: ${author} ⌋ \n`
    txt += `┊  🔍 ⌈ Vistas: ${views} ⌋\n`
    txt += `┊ 🚀 ⌈ Laiks: ${likes} ⌋\n`
    txt += `┊ 🎮 ⌈ Autor: ${author} ⌋\n`
    txt += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄`
    if(thumb){
      try{ await sock.sendMessage(jid, { image: { url: thumb }, caption: txt }, { quoted: m }) }catch{ await sock.sendMessage(jid, { text: txt }, { quoted: m }) }
    }else{
      await sock.sendMessage(jid, { text: txt }, { quoted: m })
    }
    const res = await fetch(audioUrl)
    const buffer = Buffer.from(await res.arrayBuffer())
    await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mpeg', fileName: `${title}.mp3` }, { quoted: m })
    await sock.sendMessage(jid, { react: { text: '✅', key: m.key } })
  }catch(e){
    await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: m })
  }
}
