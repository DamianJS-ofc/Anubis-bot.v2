import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

export const handler = {}
handler.name = 'backup'
handler.alias = ['respaldo','bk']
handler.category = 'owner'
handler.isOwner = true

handler.exec = async (sock, m) => {
  const jid = m.key.remoteJid
  const root = process.cwd()
  const zipName = `Anubis-V2-${Date.now()}.zip`
  const zipPath = path.join(root, zipName)

  try {
    await sock.sendMessage(jid, {text: '⏳ Creando backup COMPLETO...'}, {quoted:m})

    const excludes = [
      "node_modules/*",
      ".git/*",
      "AnubisSession/*",
      "session/*",
      "sessions/*",
      "baileys_store/*",
      ".cache/*",
      "tmp/*",
      "*.zip",
      "*.tar.gz",
      ".npm/*"
    ]
    const excludeStr = excludes.map(e => `"${e}"`).join(' ')
    
    execSync(`zip -r "${zipPath}" . -x ${excludeStr}`, { cwd: root, stdio: 'pipe' })

    // Añadir solo creds.json (no pre-keys basura)
    if (fs.existsSync(path.join(root, 'AnubisSession/creds.json'))) {
      execSync(`zip -r "${zipPath}" AnubisSession/creds.json`, { cwd: root, stdio:'pipe' })
    }

    const stat = fs.statSync(zipPath)
    const size = stat.size > 1024*1024 ? (stat.size/1024/1024).toFixed(2)+' MB' : (stat.size/1024).toFixed(2)+' KB'
    const list = execSync(`unzip -l "${zipPath}" | grep -E "comandos|anubis-nucleo|package.json" | head -n 20`, { encoding:'utf8' })

    await sock.sendMessage(jid, {
      document: fs.readFileSync(zipPath),
      fileName: zipName,
      mimetype: 'application/zip',
      caption: `✅ *BACKUP FULL ANUBIS V2*\n\n📦 ${zipName}\n📏 ${size}\n\n${list}`
    }, {quoted:m})

    setTimeout(()=> { if(fs.existsSync(zipPath)) fs.unlinkSync(zipPath) }, 5000)

  } catch(e){
    console.log(e)
    await sock.sendMessage(jid, { text: `❌ Error: ${e.message}\nInstala zip: apt install zip -y` }, {quoted:m})
  }
}
