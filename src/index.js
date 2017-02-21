const loadScript = require('./js/script-loader.js')
const debug = require('./js/debug.js')
const firePeer = require('./js/fire-peer.js')

window.DEBUG = true
async function start() {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/simple-peer/6.4.3/simplepeer.min.js')
  await loadScript('https://www.gstatic.com/firebasejs/3.6.9/firebase.js')
  debug('scripts loaded!')

  const peer = await firePeer()
  alert('got peer!')
}

start()
