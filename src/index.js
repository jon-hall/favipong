if(!window.__FAVIPONG) {
  const loadScript = require('./js/script-loader.js')
  const debug = require('./js/debug.js')('main')
  const FirePeer = require('./js/fire-peer.js')

  const Game = require('./js/favipong/index.js')

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

    let favicon = document.querySelector('link[rel*="icon"]')

    if(!favicon) {
      favicon = document.createElement('link')
      favicon.type = 'image/x-icon'
      favicon.rel = 'shortcut icon'
      document.head.appendChild(favicon)
    }

    const game = new Game({
      canvas,
      favicon,
      firepeer
    })
    game.start()
  }

  start()

  window.__FAVIPONG = true
}
