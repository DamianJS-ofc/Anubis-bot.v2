import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'

export const handler = {}
handler.name = 'archivos'
handler.alias = ['fm','panel']
handler.category = 'owner'
handler.owner = true

const ROOT = path.resolve('./')
const safe = (p) => {
  let f = path.resolve(ROOT, p || '.')
  if (!f.startsWith(ROOT)) throw new Error('Fuera del bot')
  return f
}

// VERIFICACION OWNER REAL
async function isOwner(m, sock) {
  try {
    const setting = await import('../../setting.js').then(x=>x.default||x).catch(()=>null) || {}
    const owners = setting.owner || setting.owners || setting.ownerNumber || []
    const rawOwners = Array.isArray(owners)? owners : [owners]
    // tu jid
    let sender = m.key.participant || m.key.remoteJid
    // si es LID, traducir con sock
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
  if (!(await isOwner(m, sock))) {
    await sock.sendMessage(m.key.remoteJid, {text:'⛔ Solo owner'}, {quoted:m})
    return
  }
  const chat = m.key.remoteJid
  const txt = args.join(' ').trim()
  if (txt) {
    try {
      const [a,...r] = txt.split(' ')
      const acc = a.toLowerCase()
      const resto = r.join(' ').trim()
      if (acc==='crear'){
        let [ruta,...c] = resto.split('|')
        fs.mkdirSync(path.dirname(safe(ruta)),{recursive:true})
        fs.writeFileSync(safe(ruta), c.join('|'))
        await sock.sendMessage(chat,{text:`✅ Guardado ${ruta}`},{quoted:m})
      } else if (acc==='ver'){
        let f = safe(resto||'.')
        if (fs.statSync(f).isDirectory()){
          let ls = fs.readdirSync(f).map(x=>{
            let isDir=false; try{isDir=fs.statSync(path.join(f,x)).isDirectory()}catch{}
            return `${isDir?'📁':'📝'} ${x}`
          }).join('\n')
          await sock.sendMessage(chat,{text:`📂 ${resto||'.'}:\n\n${ls}`},{quoted:m})
        } else {
          await sock.sendMessage(chat,{text:`📄 ${resto}\n\n${fs.readFileSync(f,'utf8').slice(0,3500)}`},{quoted:m})
        }
      } else if (['borrar','rm'].includes(acc)){
        fs.rmSync(safe(resto),{recursive:true,force:true})
        await sock.sendMessage(chat,{text:`🗑️ Borrado`},{quoted:m})
      } else if (['renombrar','mv'].includes(acc)){
        let [o,d] = resto.split('>').map(s=>s.trim())
        fs.renameSync(safe(o),safe(d))
        await sock.sendMessage(chat,{text:`✅ Renombrado`},{quoted:m})
      } else if (['exec','$'].includes(acc)){
        exec(resto,{cwd:ROOT,timeout:10000},(e,o,er)=>{
          sock.sendMessage(chat,{text:`💻 ${resto}\n\n${(o||er||e?.message).slice(0,3500)}`},{quoted:m})
        })
        return
      }
      try{const {loadPlugins}=await import('../../anubis-nucleo/handler.js');await loadPlugins()}catch{}
    } catch(e){await sock.sendMessage(chat,{text:`❌ ${e.message}`},{quoted:m})}
    return
  }

  let files = fs.readdirSync(ROOT).filter(f=>!f.startsWith('.')&&f!=='node_modules'&&f!=='AnubisSession').map(name=>{
    let full = path.join(ROOT,name)
    let isDir=false; try{isDir=fs.statSync(full).isDirectory()}catch{}
    let content=''
    if(!isDir){ try{let s=fs.statSync(full); if(s.size<8000) content=fs.readFileSync(full,'utf8').slice(0,2000)}catch{} }
    else { try{content=`📂 ${name}/:\n`+fs.readdirSync(full).slice(0,20).map(x=>{let id=false;try{id=fs.statSync(path.join(full,x)).isDirectory()}catch{};return `${id?'📁':'📝'} ${x}`}).join('\n')}catch{} }
    return {name, path:name, type:isDir?'folder':'file', content}
  })

  const html = `<style>*{box-sizing:border-box}body{margin:0;background:#0e0d1a;color:#fff;font-family:Quicksand,sans-serif;padding:10px}.card{background:#1e1c34;border:2px solid rgba(255,255,255,.1);border-radius:20px;padding:12px;max-width:520px;margin:auto}.item{padding:10px 12px;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.08);border-radius:12px;margin-top:6px;font-size:13px}.item.active{border-color:#ff9a9e;background:rgba(255,154,158,.2)}.btn{width:100%;border:none;border-radius:12px;padding:11px;font-weight:800;font-size:11px;margin-top:6px}.log{background:#000;border-radius:12px;padding:10px;font-family:monospace;font-size:10.5px;color:#7CFC00;margin-top:8px;white-space:pre-wrap;min-height:120px;max-height:300px;overflow:auto}input,textarea{width:100%;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.12);border-radius:12px;padding:10px;color:#fff;margin-top:6px;font-size:12px}textarea{height:120px;font-family:monospace}</style><div class="card"><div style="font-size:10px;letter-spacing:2px;color:#ff9a9e;font-weight:900">ANUBIS V4 + OWNER CHECK</div><div style="font-weight:800;font-size:16px;margin:4px 0">📂 /Anubis-Bot</div><div id="list"></div><div id="path" style="font-size:11px;color:#aaa;margin-top:8px">Ninguno</div><div id="preview" class="log">> Toca un archivo para ver</div><textarea id="code" placeholder="Edita aqui"></textarea><input id="newname" placeholder="Nuevo nombre"><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px"><button class="btn" style="background:linear-gradient(135deg,#a8edea,#fed6e3);color:#2a2440" onclick="save()">💾 GUARDAR</button><button class="btn" style="background:rgba(255,255,255,.1);color:#fff" onclick="openFull()">📂 VER EN CHAT</button><button class="btn" style="background:rgba(255,255,255,.1);color:#fff" onclick="rename()">✏️ RENOMBRAR</button><button class="btn" style="background:rgba(255,100,100,.2);color:#ff9a9e" onclick="del()">🗑️ BORRAR</button></div></div><script>
const files=${JSON.stringify(files).replace(/</g,'\\u003c')};let sel=null;
const list=document.getElementById('list'),prev=document.getElementById('preview'),codeArea=document.getElementById('code'),pathEl=document.getElementById('path');
files.forEach(f=>{let d=document.createElement('div');d.className='item';d.textContent=(f.type==='folder'?'📁':'📝')+' '+f.name;d.onclick=()=>{document.querySelectorAll('.item').forEach(x=>x.classList.remove('active'));d.classList.add('active');sel=f;pathEl.textContent=f.path;prev.textContent=f.content||'';if(f.type==='file')codeArea.value=f.content||''};list.appendChild(d);});
function save(){if(!sel)return;let c=codeArea.value;let p=sel.type==='folder'? sel.path+'/nuevo.js':sel.path;if(sel.type==='folder'){let name=prompt('Nombre:', 'test.js');if(!name)return;p=sel.path+'/'+name;}let cmd='.archivos crear '+p+' | '+c;prev.textContent='PEGA EN CHAT:\\n\\n'+cmd;}
function openFull(){if(!sel)return;prev.textContent='PEGA EN CHAT:\\n\\n.archivos ver '+sel.path;}
function del(){if(!sel)return;prev.textContent='PEGA EN CHAT:\\n\\n.archivos borrar '+sel.path;}
function rename(){if(!sel)return;let nn=document.getElementById('newname').value.trim();if(!nn)return;prev.textContent='PEGA EN CHAT:\\n\\n.archivos renombrar '+sel.path+' > '+nn;}
<\/script>`

  const visual = { messageContextInfo:{deviceListMetadata:{},deviceListMetadataVersion:2}, botForwardedMessage:{ message:{ richResponseMessage:{ messageType:1, submessages:[{messageType:2,messageText:"Files"}], unifiedResponse:{ data: Buffer.from(JSON.stringify({response_id:"v4",sections:[{view_model:{primitive:{__typename:"GenAIaeacdsnwHtmlPrimitive",payload:html,trusted_sources:["yuta.dev"]},__typename:"GenAISingleLayoutViewModel"}}]})).toString('base64') }, contextInfo:{forwardingScore:1,isForwarded:true,forwardedAiBotMessageInfo:{botJid:"867051314767696@bot"},forwardOrigin:4} } } } }
  try{ await sock.relayMessage(chat, visual, {}) }catch{}
}
