import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } from 'baileys'
import pino from 'pino'
import chalk from 'chalk'
import readline from 'readline'
import fs from 'fs'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => new Promise(r => rl.question(q, r))

console.clear()
console.log(chalk.hex('#FF00FF')(`
─────█─▄▀█──█▀▄─█─────
────▐▌──────────▐▌────
────█▌▀▄──▄▄──▄▀▐█────
───▐██──▀▀──▀▀──██▌───
──▄████▄──▐▌──▄████▄──`))
console.log(chalk.hex('#00FFFF').bold(' NÚCLEO DESPIERTO'))
console.log(chalk.hex('#FF00FF')('═══════════════════════════════════════'))
console.log(chalk.hex('#FFFF00').bold(' 𓂀⛧°。⋆ 𝔸ℕ𝕌𝔹𝕀𝕊-𝔹𝕆𝕋 ⋆ 。°⛧𓂀'))
console.log(chalk.hex('#00FF00')(' ☕︎ Powered by The gaming team'))
console.log(chalk.hex('#FF00FF')('═══════════════════════════════════════\n'))

let isRestart = false
try{
  if(fs.existsSync('./AnubisSession/restart.json')){
    isRestart = true
    fs.rmSync('./AnubisSession/restart.json', {force:true})
    console.log(chalk.yellow('♻️ Reinicio desde WhatsApp detectado - reconectando directo...\n'))
  }
}catch{}

let opcionGlobal = '2'
let numeroGlobal = null
if(!isRestart &&!fs.existsSync('./AnubisSession/creds.json')){
  console.log(chalk.hex('#00FFFF')(' ➣ [ 1 ] ') + chalk.white('codigo de 8 digitos'))
  console.log(chalk.hex('#FF69B4')(' ➣ [ 2 ] ') + chalk.white('código QR'))
  console.log(chalk.hex('#FF00FF')('\n ➣ Elije una opcion:\n'))
  opcionGlobal = await ask(chalk.green('> '))
  opcionGlobal = opcionGlobal.trim()
  if(opcionGlobal === '1'){
    console.log(chalk.hex('#00FFFF').bold('\n😎 Genial empezemos con esto\n'))
    numeroGlobal = await ask(chalk.cyan('Numero con pais sin + (ej 5491123456789): '))
    numeroGlobal = numeroGlobal.replace(/\D/g,'')
  }
} else {
  // si ya hay sesion, no pregunta nada
  isRestart = true
}

async function start(){
  const { state, saveCreds } = await useMultiFileAuthState('./AnubisSession')
  const { version } = await fetchLatestBaileysVersion()
  const handlerMod = await import('./handler.js')
  await handlerMod.loadPlugins()

  const sock = makeWASocket({
    version,
    logger: pino({level:'silent'}),
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
    browser: ['Chrome','Chrome','110'],
    printQRInTerminal: opcionGlobal === '2' &&!isRestart &&!fs.existsSync('./AnubisSession/creds.json'),
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000
  })

  sock.ev.on('creds.update', saveCreds)

  let codeRequested = false
  sock.ev.on('connection.update', async ({connection, lastDisconnect})=>{
    if(connection==='close'){
      let statusCode = lastDisconnect?.error?.output?.statusCode
      console.log('Cerrado', statusCode)
      if(statusCode === DisconnectReason.loggedOut || statusCode === 401){
        console.log(chalk.red('Sesion invalida, borrando...'))
        fs.rmSync('./AnubisSession',{recursive:true,force:true})
        process.exit()
      } else {
        console.log(chalk.yellow('Reconectando en 3s...'))
        setTimeout(start,3000)
      }
    }
    if(connection==='open'){
      console.log(chalk.hex('#00FF00').bold('\n✅ CONECTADO - Ya aparece en vinculados\n'))
    }
    if(!state.creds.registered && opcionGlobal==='1' &&!codeRequested &&!isRestart){
      codeRequested = true
      await new Promise(r=>setTimeout(r,3000))
      try{
        let c = await sock.requestPairingCode(numeroGlobal)
        console.log(chalk.black.bgWhite(`\n CODIGO: ${c} \n`))
      }catch(e){ console.log(chalk.red('Error codigo:'), e.message) }
    }
  })

  sock.ev.on('messages.upsert', async ({messages})=>{
    let m = messages[0]
    if(!m?.message) return
    try{
      await handlerMod.handler(sock, m)
    }catch(e){
      console.log('Error handler', e)
    }
  })

  sock.ev.on('group-participants.update', async (update)=>{
    try{ await handlerMod.handleParticipants(sock, update) }catch{}
  })
}

start()
