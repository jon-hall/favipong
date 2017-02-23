const loadScript = require('./js/script-loader.js')
const debug = require('./js/debug.js')
const FirePeer = require('./js/fire-peer.js')

const Game = require('./js/favipong/index.js')

// TODO: toggle me!
window.DEBUG = true

async function start() {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/simple-peer/6.4.3/simplepeer.min.js')
  await loadScript('https://www.gstatic.com/firebasejs/3.6.9/firebase.js')
  debug('scripts loaded!')

  const firepeer = new FirePeer()

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 28

  if(!window.DEBUG) {
    canvas.style.display = 'none'
  }
  document.body.appendChild(canvas)

  const game = new Game({
    canvas,
    favicon: document.querySelector('#favicon'),
    firepeer
  })
  game.start()
}

start()
