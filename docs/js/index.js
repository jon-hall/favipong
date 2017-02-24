/* This header is placed at the beginning of the output file and defines the
	special `__require`, `__getFilename`, and `__getDirname` functions.
*/
(function() {
	/* __modules is an Array of functions; each function is a module added
		to the project */
var __modules = {},
	/* __modulesCache is an Array of cached modules, much like
		`require.cache`.  Once a module is executed, it is cached. */
	__modulesCache = {},
	/* __moduleIsCached - an Array of booleans, `true` if module is cached. */
	__moduleIsCached = {};
/* If the module with the specified `uid` is cached, return it;
	otherwise, execute and cache it first. */
function __require(uid, parentUid) {
	if(!__moduleIsCached[uid]) {
		// Populate the cache initially with an empty `exports` Object
		__modulesCache[uid] = {"exports": {}, "loaded": false};
		__moduleIsCached[uid] = true;
		if(uid === 0 && typeof require === "function") {
			require.main = __modulesCache[0];
		} else {
			__modulesCache[uid].parent = __modulesCache[parentUid];
		}
		/* Note: if this module requires itself, or if its depenedencies
			require it, they will only see an empty Object for now */
		// Now load the module
		__modules[uid].call(this, __modulesCache[uid], __modulesCache[uid].exports);
		__modulesCache[uid].loaded = true;
	}
	return __modulesCache[uid].exports;
}
/* This function is the replacement for all `__filename` references within a
	project file.  The idea is to return the correct `__filename` as if the
	file was not concatenated at all.  Therefore, we should return the
	filename relative to the output file's path.

	`path` is the path relative to the output file's path at the time the
	project file was concatenated and added to the output file.
*/
function __getFilename(path) {
	return require("path").resolve(__dirname + "/" + path);
}
/* Same deal as __getFilename.
	`path` is the path relative to the output file's path at the time the
	project file was concatenated and added to the output file.
*/
function __getDirname(path) {
	return require("path").resolve(__dirname + "/" + path + "/../");
}
/********** End of header **********/
/********** Start module 0: C:\Repos\favipong\src\index.js **********/
__modules[0] = function(module, exports) {
const loadScript = __require(1,0)
const debug = __require(2,0)('main')
const FirePeer = __require(3,0)

const Game = __require(4,0)

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

return module.exports;
}
/********** End of module 0: C:\Repos\favipong\src\index.js **********/
/********** Start module 1: C:\Repos\favipong\src\js\script-loader.js **********/
__modules[1] = function(module, exports) {
module.exports = function(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')

    script.type = 'text/javascript'
    script.src = src
    script.onload = resolve
    script.onerror = reject

    document.head.appendChild(script)
  })
}

return module.exports;
}
/********** End of module 1: C:\Repos\favipong\src\js\script-loader.js **********/
/********** Start module 2: C:\Repos\favipong\src\js\debug.js **********/
__modules[2] = function(module, exports) {
module.exports = function(type) {
  return function(msg, ...args) {
    if(!window.DEBUG || (typeof window.DEBUG === 'string' && window.DEBUG.split(';').indexOf(type) < 0)) {
      return
    }

    console.log(`[favipong] (${type}) ${msg}`, ...args)
  }
}

return module.exports;
}
/********** End of module 2: C:\Repos\favipong\src\js\debug.js **********/
/********** Start module 3: C:\Repos\favipong\src\js\fire-peer.js **********/
__modules[3] = function(module, exports) {
const config = __require(5,3)
const debug = __require(2,3)('firepeer')

module.exports = class FirePeer {
  async connect() {
    debug('firepeer:connect')
    if(this.peer) {
      return
    }

    const connection = await connectToPeer()
    this.peer = connection.peer
    this.master = connection.master

    this.handlers = []

    this.peer.on('error', console.error)
    this.peer.on('close', () => console.error('peer closed'))
    this.peer.on('data', (data) => this._onData(data))
  }

  async disconnect() {
    debug('firepeer:disconnect')
    if(!this.peer) {
      return
    }

    await new Promise((resolve) => this.peer.destroy(resolve))
    this.peer = null
  }

  async send(data) {
    if(!this.peer) {
      throw new Error('not connected')
    }

    await this.peer.send(JSON.stringify(data))
  }

  _onData(data) {
    const parsed = JSON.parse(data)
    const remove = []

    this.handlers.forEach((handler) => {
      let passed = true

      if(typeof handler.test === 'function') {
        passed = handler.test(parsed)
      }

      if(!passed) {
        return
      }

      if(handler.once) {
        remove.push(handler)
      }

      handler.fn(parsed)
    })

    remove.forEach((removed) => this._removeHandler(removed))
  }

  _removeHandler(handler) {
    const index = this.handlers.indexOf(handler)

    if(index >= 0) {
      this.handlers.splice(index, 1)
      return true
    }

    return false
  }

  onData(fn) {
    debug('firepeer:onData')
    if(!this.peer) {
      throw new Error('not connected')
    }

    this.handlers.push({ fn })
  }

  async onNextData(test, timeout = 500) {
    debug('firepeer:onNextData')
    return new Promise((resolve, reject) => {
      const handler = {
        fn: resolve,
        once: true,
        test
      }

      this.handlers.push(handler)

      setTimeout(() => {
        if(this._removeHandler(handler)) {
          reject('timeout')
        }
      }, timeout)
    })
  }
}

async function getOffersFromFirebase() {
  const firebaseConfig = {
      apiKey: config.firebase.apiKey,
      authDomain: config.firebase.authDomain,
      databaseURL: config.firebase.databaseURL,
      storageBucket: config.firebase.storageBucket,
      messagingSenderId: config.firebase.senderId
    }
  firebase.initializeApp(firebaseConfig)

  await firebase.auth().signInAnonymously()

  const offers = await firebase.database()
    .ref('/offers')

  return offers
}
async function connectInitiator(offersRef) {
  return new Promise((resolve, reject) => {
    debug('no offers, connecting initiator peer...')

    const initiator = new SimplePeer({
      initiator: true,
      trickle: false
    })

    debug('made peer', initiator)

    initiator.on('error', (err) => {
      debug('error', err)
      reject(err)
    })

    let initOfferRef
    initiator.on('signal', async function (data) {
      debug('signal', data)

      if(data.type !== 'offer') {
        return
      }
      initOfferRef = await offersRef.push({ offer: data })
      debug('stored offer to firebase', initOfferRef)

      let isInitialValue = true
      initOfferRef.on('value', async function(snapshot) {
        debug('init value')
        if(isInitialValue) {
          isInitialValue = false
          return
        }

        const val = snapshot.val()
        const counter = val && val.counter

        if(!counter) {
          return
        }

        debug('received counter', counter)
        await initOfferRef.remove()
        initOfferRef.off('value')
        initiator.signal(counter)
      })
    })

    initiator.on('connect', async function () {
      debug('connect')

      resolve({ peer: initiator, master: true })
    })
  })
}

function connectFollower(offers, offersRef) {
  return new Promise((resolve, reject) => {
    debug('offers :D', offers)

    const follower = new SimplePeer({
      initiator: false,
      trickle: false
    })
    const targetOfferId = Object.keys(offers)[0]
    follower.on('error', err => {
      debug('error (follower)', err)
      reject(err)
    })

    follower.on('signal', async function(data) {
      debug('signal (follower)', data)

      if(data.type !== 'answer') {
        return
      }
      await offersRef.child(targetOfferId).update({ counter: data })
    })

    follower.on('connect', function () {
      debug('connect (follower)')
      resolve({ peer: follower, master: false })
    })

    const targetOffer = offers[targetOfferId].offer

    debug('connecting (follower)', targetOffer)
    follower.signal(targetOffer)
  })
}

async function connectToPeer() {
  const offersRef = await getOffersFromFirebase()
  const offersSnapshot = await offersRef.once('value')
  const offers = offersSnapshot.val()
  const filteredOffers = Object.keys(offers || {}).reduce((filtered, key) => {
    if(!offers[key].counter) {
      filtered[key] = offers[key]
    }

    return filtered
  }, {})

  if(Object.keys(filteredOffers).length) {
    return await connectFollower(filteredOffers, offersRef)
  }

  return await connectInitiator(offersRef)
}

return module.exports;
}
/********** End of module 3: C:\Repos\favipong\src\js\fire-peer.js **********/
/********** Start module 4: C:\Repos\favipong\src\js\favipong\index.js **********/
__modules[4] = function(module, exports) {
const STATES = __require(6,4)
const Stage = __require(7,4)
const Ball = __require(8,4)
const LocalPaddle = __require(9,4)
const RemotePaddle = __require(10,4)
const Score = __require(11,4)
const ResultScreen = __require(12,4)
const config = __require(5,4)
const debugFactory = __require(2,4)
const serveDebug = debugFactory('serve')
const scoreDebug = debugFactory('score')
const debug = debugFactory('game-main')

module.exports = class Game {
  constructor({ canvas, favicon, firepeer }) {
    this._attachAbandonHook()

    this.canvas = canvas
    this.context = canvas.getContext('2d')
    this.width = canvas.width
    this.height = canvas.height
    this.__faviconCache = favicon.href
    this.favicon = favicon

    this.peer = firepeer

    this.states = []

    this.reset()

    this.ball = new Ball()
    this.stage.add(this.ball)

    this.localPaddle = new LocalPaddle({
      colour: config.palette.players.local,
      x: 1,
      y: 8,
    })
    this.stage.add(this.localPaddle)

    this.remotePaddle = new RemotePaddle({
      colour: config.palette.players.remote,
      x: 24,
      y: 8,
    })
    this.stage.add(this.remotePaddle)

    this.scoreboard = new Score()
    this.stage.add(this.scoreboard)

    this.resultScreen = new ResultScreen()
    this.stage.add(this.resultScreen)
    this.pushState(STATES.SEARCHING)
    this.pushState(STATES.PAUSED)

    debug('game constructed')
  }

  get state() {
    return this.states[this.states.length - 1] || STATES.PAUSED
  }

  start() {
    this.popState()

    if(this.__running) {
      return
    }
    this.__running = setInterval(() => this._runLoop(), 1000 / 15)
  }

  pause() {
    if(!this.__running) {
      return
    }

    clearInterval(this.__running)
    this.__running = null

    this.pushState(STATES.PAUSED)
  }

  reset() {
    this.pause()

    this.stage = new Stage({
      width: this.width,
      height: this.height
    })
  }

  _attachAbandonHook() {
    let lastShift

    window.addEventListener('keydown', (event) => {
      if(event.code === 'ShiftLeft') {
        const now = performance.now()
        if(lastShift && (now - lastShift < 500)) {
          this._abandon()
        } else {
          lastShift = now
        }
      }
    })
  }

  _abandon() {
    this.pause()
    this.stage.destroy()
    this.favicon.href = this.__faviconCache
  }

  _runLoop() {
    this._handleStateTick()

    this.stage.tick({ game: this })

    this.stage.draw({
      game: this,
      context: this.context,
      canvas: this.canvas
    })

    this._updateFavicon()
  }

  _handleStateTick() {
    switch(this.state) {
      case STATES.SEARCHING:
        this._trySearch()
        break
    }
  }

  _updateFavicon() {
    this.favicon.href = this.canvas.toDataURL()
  }

  async _trySearch() {
    if(this._searching) {
      return
    }

    debug('_trySearch')
    this._searching = true
    try {
      await this.peer.connect()
      this.popState()
      this.pushState(STATES.PAUSED)
      debug('_trySearch: connected')

      this.peer.onData((data) => this._onPeerData(data))
      this._setupPaddles()
      this.scoreboard.setScoreColours(this.peer.master)
      await this._resetServe()
      this._doServe()
    } catch(ex) {
      this.popState()
      this.pushState(STATES.ERROR)
    }
  }

  _setupPaddles() {
    this.localPaddle.setPeer(this.peer)
    this.remotePaddle.setPeer(this.peer)
    if(this.peer.master) {
      this._setupPaddle1(this.localPaddle)
      this._setupPaddle2(this.remotePaddle)
      return
    }

    this._setupPaddle1(this.remotePaddle)
    this._setupPaddle2(this.localPaddle)
  }

  _setupPaddle1(paddle) {
    paddle.x = 1
    paddle.y = 8
    paddle.vx = 0
    paddle.vy = 0
  }

  _setupPaddle2(paddle) {
    paddle.x = 24
    paddle.y = 8
    paddle.vx = 0
    paddle.vy = 0
  }

  async _onPeerData(event) {
    switch(event.type) {
      case 'serve':
        if(this.peer.master) {
          return
        }

        serveDebug('remote:serve-sync', JSON.stringify(event.data))
        this._configureServe(event.data)
        await this.peer.send({ type: 'serve-ack' })
        this._doServe()
        break
      case 'score':
        if(!this._isPlayerLocal(event.data.player)) {
          return
        }
        while(this.state !== STATES.PAUSED) {
          this.popState()
        }
        debug('addScore:paused')

        scoreDebug('remote:score-sync', JSON.stringify(event.data))
        await this.peer.send({ type: 'score-ack' })
        this.scoreboard.setScores(event.data.scores)
        this._displayScores()
        break
    }
  }
  pushState(state) {
    this.states.push(state)
  }

  popState() {
    this.states.pop()
  }

  async addScore({ player }) {
    debug('addScore')
    if(this._isPlayerLocal(player)) {
      return
    }
    while(this.state !== STATES.PAUSED) {
      this.popState()
    }
    debug('addScore:paused')
    try {
      await this._confirmScoreRemote({ player })
    } catch(ex) {
      this.pushState(STATES.ERROR)
      return
    }
    this.scoreboard.addScore({ player })
    this._displayScores()
  }

  _isPlayerLocal(player) {
    if(player === 1 && this.peer && this.peer.master) {
      return true
    }

    if(player === 2 && this.peer && !this.peer.master) {
      return true
    }

    return false
  }

  _displayScores() {
    this.pushState(STATES.SHOW_SCORE)
    setTimeout(async () => {
      const winner = this._whoWon()
      if(winner) {
        this.popState()
        this._finishGame(this._isPlayerLocal(winner))
        return
      }

      this.popState()

      await this._resetServe()
    }, 1000)
  }

  async _confirmScoreRemote({ player }) {
    const player1 = this.scoreboard.scores.player1 + (player === 1 ? 1 : 0)
    const player2 = this.scoreboard.scores.player2 + (player === 2 ? 1 : 0)

    scoreDebug('local:score-sync', JSON.stringify({
      player,
      scores: {
        player1,
        player2
      }
    }))

    await this.peer.send({
      type: 'score',
      data: {
        player,
        scores: {
          player1,
          player2
        }
      }
    })

    debug('_confirmScoreRemote: awaiting ack')
    await this.peer.onNextData((data) => data.type === 'score-ack')
    debug('_confirmScoreRemote: got ack')
  }

  async _resetServe() {
    if(!this.peer || !this.peer.master) {
      return
    }

    await this._configureServeRemote()
    this._doServe()
  }

  async _configureServeRemote() {
    debug('_configureServeRemote')
    this.ball.reset()
    this._setupPaddles()

    serveDebug('local:serve-sync', JSON.stringify({
      ball: {
        x: this.ball.x,
        y: this.ball.y,
        vx: this.ball.vx,
        vy: this.ball.vy
      }
    }))

    await this.peer.send({
      type: 'serve',
      data: {
        ball: {
          x: this.ball.x,
          y: this.ball.y,
          vx: this.ball.vx,
          vy: this.ball.vy
        }
      }
    })

    debug('_configureServeRemote: awaiting ack')
    await this.peer.onNextData((data) => data.type === 'serve-ack')
    debug('_configureServeRemote: got ack')
  }

  _configureServe(serveData) {
    this.ball.x = serveData.ball.x
    this.ball.y = serveData.ball.y
    this.ball.vx = serveData.ball.vx
    this.ball.vy = serveData.ball.vy
    this._setupPaddles()
  }

  _doServe() {
    setTimeout(() => {
      this.pushState(STATES.PLAYING)
    }, 1000)
  }

  _whoWon() {
    return this.scoreboard.whoWon()
  }

  _finishGame(didWeWin) {
    this.resultScreen.setResult(didWeWin)
    this.pushState(STATES.COMPLETE)
  }
}

return module.exports;
}
/********** End of module 4: C:\Repos\favipong\src\js\favipong\index.js **********/
/********** Start module 5: C:\Repos\favipong\src\js\config.js **********/
__modules[5] = function(module, exports) {
module.exports = {
  firebase: {
    apiKey: 'AIzaSyDemDiurFrc9RloikuvntNcqspA4YFLI0M',
    authDomain: 'favipong.firebaseapp.com',
    databaseURL: 'https://favipong.firebaseio.com',
    storageBucket: 'favipong.appspot.com',
    senderId: '313594361579'
  },
  palette: {
    players: {
      local: 'rgb(0, 180, 255)',
      remote: 'orange'
    },
    win: 'rgb(0, 255, 60)',
    lose: 'rgb(255, 0, 0)'
  }
}

return module.exports;
}
/********** End of module 5: C:\Repos\favipong\src\js\config.js **********/
/********** Start module 6: C:\Repos\favipong\src\js\favipong\states.js **********/
__modules[6] = function(module, exports) {
module.exports = {
  PAUSED: 0,
  SEARCHING: 1,
  PLAYING: 2,
  SHOW_SCORE: 3,
  COMPLETE: 4,
  ERROR: 5
}

return module.exports;
}
/********** End of module 6: C:\Repos\favipong\src\js\favipong\states.js **********/
/********** Start module 7: C:\Repos\favipong\src\js\favipong\objects\stage.js **********/
__modules[7] = function(module, exports) {
const GameObject = __require(13,7)
const Rectangle = __require(14,7)

module.exports = class Stage extends GameObject {
  constructor({
    colour= 'black',
    width,
    height
  } = {}) {
    const visual = new Rectangle({ fill: colour })
    super({
      visual,
      width,
      height
    })
  }
}

return module.exports;
}
/********** End of module 7: C:\Repos\favipong\src\js\favipong\objects\stage.js **********/
/********** Start module 8: C:\Repos\favipong\src\js\favipong\objects\ball.js **********/
__modules[8] = function(module, exports) {
const GameObject = __require(13,8)
const Paddle = __require(15,8)
const Rectangle = __require(14,8)
const STATES = __require(6,8)
const scoringDebug = __require(2,8)('scoring')

module.exports = class Ball extends GameObject {
  constructor({
    colour= 'white',
    size = 4
  } = {}) {
    const visual = new Rectangle({ fill: colour })
    super({
      visual,
      width: size,
      height: size
    })

    this.reset()
  }

  reset() {
    this.x = 14
    this.y = 14
    this.vx = Math.random() < 0.5 ? -1 : 1
    this.vy = 2 * (Math.random() - 0.5)
  }

  shouldDraw({ game }) {
    return [
      STATES.SEARCHING,
      STATES.COMPLETE,
      STATES.ERROR
    ].indexOf(game.state) < 0
  }

  tick({ game }) {
    if(game.state !== STATES.PLAYING) {
      return
    }

    const result = this.adjustPosition({ game })
    switch(result.bounceX) {
      case 1:
        scoringDebug('player 1 score', JSON.stringify(this))
        game.addScore({ player: 1 })
        break
      case -1:
        scoringDebug('player 2 score', JSON.stringify(this))
        game.addScore({ player: 2 })
        break
    }

    game.stage.allChildren.some(child => {
      if(child instanceof Paddle) {
        const hit = this._tryCollidePaddle(child)

        if(hit) {
          child.hit({ ball: this })
        }
        return hit
      }
    })
  }

  _tryCollidePaddle(paddle) {
    const x1 = this.x
    const y1 = this.y
    const x2 = x1 + this.width
    const y2 = y1 + this.height
    const px1 = paddle.x
    const py1 = paddle.y
    const px2 = px1 + paddle.width
    const py2 = py1 + paddle.height

    const xOverlap = this._getOverlap(x1, x2, px1, px2)
    const yOverlap = this._getOverlap(y1, y2, py1, py2)

    if(!xOverlap || !yOverlap) {
      return false
    }
    this.x += xOverlap
    this.vx *= -1
    const adjust = Math.sign(this.vy) === Math.sign(paddle.vy) ?
      paddle.vy / (1 + Math.abs(this.vy)) :
      paddle.vy

    this.vy += adjust

    return true
  }
  _getOverlap(aMin, aMax, bMin, bMax) {
    return aMin <= bMin ?
      aMax <= bMin ?
        0 :
        bMin - aMax :
      aMin >= bMax ?
        0 :
        bMax - aMin
  }
}

return module.exports;
}
/********** End of module 8: C:\Repos\favipong\src\js\favipong\objects\ball.js **********/
/********** Start module 9: C:\Repos\favipong\src\js\favipong\objects\local-paddle.js **********/
__modules[9] = function(module, exports) {
const Paddle = __require(15,9)
const Rectangle = __require(14,9)
const KEYCODE_UP_ARROW = 38
const KEYCODE_DOWN_ARROW = 40

module.exports = class LocalPaddle extends Paddle {
  constructor({
    colour,
    x,
    y,
    upKey = KEYCODE_UP_ARROW,
    downKey = KEYCODE_DOWN_ARROW
  } = {}) {
    super({
      colour,
      x,
      y
    })

    this.upKey = upKey
    this.downKey = downKey

    const keydownHandler = (event) => this.onKeydown(event)
    const keyupHandler = (event) => this.onKeyup(event)

    window.addEventListener('keydown', keydownHandler)
    window.addEventListener('keyup', keyupHandler)

    this._eventCleanup = () => {
      window.removeEventListener('keydown', keydownHandler)
      window.removeEventListener('keyup', keyupHandler)
    }
  }

  destroy() {
    this._eventCleanup()
  }

  setPeer(peer) {

    this.peer = peer
  }

  hit({ ball }) {
    if(!this.peer) {
      return
    }
    this.peer.send({
      type: 'hit',
      data: {
        paddle: {
          x: this.x,
          y: this.y,
          vx: this.vx,
          vy: this.vy
        },
        ball: {
          x: ball.x,
          y: ball.y,
          vx: ball.vx,
          vy: ball.vy
        }
      }
    })
  }

  tick({ game }) {
    super.tick({ game })
    if(!this.peer) {
      return
    }

    this.peer.send({
      type: 'tick',
      data: {
        paddle: {
          x: this.x,
          y: this.y,
          vx: this.vx,
          vy: this.vy
        }
      }
    })
  }
  onKeydown(event) {
    switch(event.which) {
      case this.upKey:
        this.vy = -this.speed
        break
      case this.downKey:
        this.vy = this.speed
        break
    }
  }

  onKeyup(event) {
    switch(event.which) {
      case this.upKey:
        this.vy = 0
        break
      case this.downKey:
        this.vy = 0
        break
    }
  }
}

return module.exports;
}
/********** End of module 9: C:\Repos\favipong\src\js\favipong\objects\local-paddle.js **********/
/********** Start module 10: C:\Repos\favipong\src\js\favipong\objects\remote-paddle.js **********/
__modules[10] = function(module, exports) {
const Paddle = __require(15,10)
const Rectangle = __require(14,10)
const KEYCODE_UP_ARROW = 38
const KEYCODE_DOWN_ARROW = 40

module.exports = class RemotePaddle extends Paddle {
  constructor({
    colour,
    x,
    y
  } = {}) {
    super({
      colour,
      x,
      y
    })
  }

  setPeer(peer) {
    peer.onData((event) => this.onPeerData(event))
  }

  onPeerData(event) {
    switch(event.type) {
      case 'tick':
        this.x = event.data.paddle.x
        this.y = event.data.paddle.y
        this.vx = event.data.paddle.vx
        this.vy = event.data.paddle.vy
        break
    }
  }
}

return module.exports;
}
/********** End of module 10: C:\Repos\favipong\src\js\favipong\objects\remote-paddle.js **********/
/********** Start module 11: C:\Repos\favipong\src\js\favipong\objects\score.js **********/
__modules[11] = function(module, exports) {
const GameObject = __require(13,11)
const Text = __require(16,11)
const Rectangle = __require(14,11)
const STATES = __require(6,11)
const config = __require(5,11)
const firstTo = 3

module.exports = class Score extends GameObject {
  constructor({
    x = 0,
    y = 0,
    width = 28,
    height = 28
  } = {}) {
    const visual = new Rectangle({ fill: 'rgba(40, 40, 40, 0.7)' })

    const fontSize = 23
    const fontY = -1
    super({
      visual,
      width,
      height,
      x,
      y,
      children: [
        new Text({
          x: 1,
          y: fontY,
          width: 11,
          height: fontSize,
          colour: config.palette.player1,
          text: '0'
        }),
        new Text({
          x: 12,
          y: fontY - 2,
          width: 4,
          height: fontSize,
          colour: 'rgb(250, 250, 250)',
          text: '|'
        }),
        new Text({
          x: 16,
          y: fontY,
          width: 11,
          height: fontSize,
          colour: config.palette.player2,
          text: '0'
        })
      ]
    })

    this.scores = {
      player1: 0,
      player2: 0
    }

    this._refreshScoresText()
  }

  shouldDraw({ game }) {
    return game.state === STATES.SHOW_SCORE
  }

  _refreshScoresText() {
    this.children[0].text = `${this.scores.player1}`
    this.children[2].text = `${this.scores.player2}`
  }

  reset() {
    this.scores = {
      player1: 0,
      player2: 0
    }

    this._refreshScoresText()
  }

  setScoreColours(master) {
    this.children[0].visual.fill = master ?
      config.palette.players.local :
      config.palette.players.remote

    this.children[2].visual.fill = master ?
      config.palette.players.remote :
      config.palette.players.local
  }

  addScore({ player }) {
    if(player === 1) {
      this.scores.player1++
    } else if(player === 2) {
      this.scores.player2++
    }

    this._refreshScoresText()
  }

  setScores({ player1, player2 }) {
    this.scores.player1 = player1
    this.scores.player2 = player2

    this._refreshScoresText()
  }

  whoWon() {
    if(this.scores.player1 >= firstTo) {
      return 1
    }

    if(this.scores.player2 >= firstTo) {
      return 2
    }

    return 0
  }
}

return module.exports;
}
/********** End of module 11: C:\Repos\favipong\src\js\favipong\objects\score.js **********/
/********** Start module 12: C:\Repos\favipong\src\js\favipong\objects\result-screen.js **********/
__modules[12] = function(module, exports) {
const GameObject = __require(13,12)
const Text = __require(16,12)
const Rectangle = __require(14,12)
const STATES = __require(6,12)
const config = __require(5,12)

module.exports = class Score extends GameObject {
  constructor({
    x = 0,
    y = 0,
    width = 28,
    height = 28
  } = {}) {
    const visual = new Rectangle({ fill: 'rgba(40, 40, 40, 0.7)' })

    const fontSize = 23
    const fontY = -1
    const win = new Text({
      x: 4,
      y: fontY,
      width: 20,
      height: fontSize,
      colour: config.palette.win,
      text: 'W'
    })

    const lose = new Text({
      x: 8,
      y: fontY,
      width: 20,
      height: fontSize,
      colour: config.palette.lose,
      text: 'L'
    })

    super({
      visual,
      width,
      height,
      x,
      y,
      children: [win]
    })

    this.win = win
    this.lose = lose
  }

  shouldDraw({ game }) {
    return game.state === STATES.COMPLETE
  }

  setResult(win) {
    this.children = win ? [this.win] : [this.lose]
  }
}

return module.exports;
}
/********** End of module 12: C:\Repos\favipong\src\js\favipong\objects\result-screen.js **********/
/********** Start module 13: C:\Repos\favipong\src\js\favipong\objects\game-object.js **********/
__modules[13] = function(module, exports) {
module.exports = class GameObject {
  constructor({
    visual,
    children = [],
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    vx = 0,
    vy = 0
  } = {}) {
    this.visual = visual
    this.children = children
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.vx = vx
    this.vy = vy
  }

  get allChildren() {
    return this.children.reduce(
      (allChildren, child) => allChildren.concat([child]).concat(child.allChildren),
      []
    )
  }

  destroy() {
    this.children.forEach(child => child.destroy())
  }
  reset() {
    this.children.forEach(child => child.reset())
  }

  add(object) {
    this.children.push(object)
  }
  shouldTick({ game }) {
    return true
  }

  tick({ game }) {
    if(!this.shouldTick({ game })) {
      return
    }
    this.children.forEach(child => child.tick({ game }))
  }
  adjustPosition({
    game,
    unbounded = false,
    elasticity = 1
  } = {}) {
    const adjustedX = this.x + this.vx
    const adjustedY = this.y + this.vy

    if(unbounded) {
      this.x = adjustedX
      this.y = adjustedY
      return { bounceX: 0, bounceY: 0 }
    }

    const x = this._handleOverflow(elasticity, adjustedX, this.width, 0, game.width, this.vx)
    this.x = x.position
    this.vx = x.velocity

    const y = this._handleOverflow(elasticity, adjustedY, this.height, 0, game.height, this.vy)
    this.y = y.position
    this.vy = y.velocity
    return { bounceX: x.bounce, bounceY: y.bounce }
  }
  _handleOverflow(elasticity, magnitude, size, lowerLimit, upperLimit, currentVelocity) {
    let position = magnitude
    let velocity = currentVelocity
    let bounce = 0

    if(magnitude + size > upperLimit) {
      position = magnitude - ((1 + elasticity) * (magnitude + size - upperLimit))
      velocity *= -elasticity
      bounce = 1
      return { position, velocity, bounce }
    }

    if(magnitude < lowerLimit) {
      position = magnitude + ((1 + elasticity) * (lowerLimit - magnitude))
      velocity *= -elasticity
      bounce = -1
    }

    return { position, velocity, bounce }
  }
  shouldDraw({ game }) {
    return true
  }

  draw({ game, context, canvas }) {
    if(!this.shouldDraw({ game })) {
      return
    }

    this.visual.draw({
      context,
      canvas,
      object: this,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    })

    this.children.forEach(child => child.draw({ game, context, canvas }))
  }
}

return module.exports;
}
/********** End of module 13: C:\Repos\favipong\src\js\favipong\objects\game-object.js **********/
/********** Start module 14: C:\Repos\favipong\src\js\favipong\visuals\rectangle.js **********/
__modules[14] = function(module, exports) {
const GameVisual = __require(17,14)

module.exports = class Rectangle extends GameVisual {
  constructor({
    fill = 'white'
  } = {}) {
    super()
    this.fill = fill
  }

  draw({
    context,
    x,
    y,
    width,
    height
  }) {
    context.fillStyle = this.fill
    context.fillRect(x, y, width, height)
  }
}

return module.exports;
}
/********** End of module 14: C:\Repos\favipong\src\js\favipong\visuals\rectangle.js **********/
/********** Start module 15: C:\Repos\favipong\src\js\favipong\objects\paddle.js **********/
__modules[15] = function(module, exports) {
const GameObject = __require(13,15)
const Rectangle = __require(14,15)
const STATES = __require(6,15)

module.exports = class Paddle extends GameObject {
  constructor({
    colour,
    x,
    y,
    width = 3,
    height = 11,
    speed = 1
  } = {}) {
    const visual = new Rectangle({ fill: colour })

    super({
      visual,
      width,
      height,
      x,
      y
    })

    this.speed = speed
  }

  tick({ game }) {
    if(game.state !== STATES.PLAYING) {
      return
    }

    this.adjustPosition({ game, elasticity: 0 })
  }

  shouldDraw({ game }) {
    return [
      STATES.SEARCHING,
      STATES.COMPLETE,
      STATES.ERROR
    ].indexOf(game.state) < 0
  }

  hit({ ball }) {
  }
}

return module.exports;
}
/********** End of module 15: C:\Repos\favipong\src\js\favipong\objects\paddle.js **********/
/********** Start module 16: C:\Repos\favipong\src\js\favipong\objects\text.js **********/
__modules[16] = function(module, exports) {
const GameObject = __require(13,16)
const TextVisual = __require(18,16)
const STATES = __require(6,16)

module.exports = class Text extends GameObject {
  constructor({
    text,
    colour,
    x,
    y,
    width = 28 - x,
    height = 12
  } = {}) {
    const visual = new TextVisual({ fill: colour })

    super({
      visual,
      width,
      height,
      x,
      y
    })

    this.text = text
  }
}

return module.exports;
}
/********** End of module 16: C:\Repos\favipong\src\js\favipong\objects\text.js **********/
/********** Start module 17: C:\Repos\favipong\src\js\favipong\visuals\game-visual.js **********/
__modules[17] = function(module, exports) {
module.exports = class GameVisual {
  draw({ game, context, canvas, x, y, width, height }) {
    throw new Error('draw not implemented')
  }
}

return module.exports;
}
/********** End of module 17: C:\Repos\favipong\src\js\favipong\visuals\game-visual.js **********/
/********** Start module 18: C:\Repos\favipong\src\js\favipong\visuals\text.js **********/
__modules[18] = function(module, exports) {
const GameVisual = __require(17,18)

module.exports = class Text extends GameVisual {
  constructor({
    fill = 'white',
    font = 'sans-serif',
    fontWeight = 'bold'
  } = {}) {
    super()
    this.fill = fill
    this.font = font
    this.fontWeight = fontWeight
  }

  draw({
    context,
    x,
    y,
    object,
    width,
    height
  }) {
    context.fillStyle = this.fill
    context.font = `${this.fontWeight} ${height}px ${this.font}`
    context.fillText(object.text, x, y + height, width)
  }
}

return module.exports;
}
/********** End of module 18: C:\Repos\favipong\src\js\favipong\visuals\text.js **********/
/********** Footer **********/
if(typeof module === "object")
	module.exports = __require(0);
else
	return __require(0);
})();
/********** End of footer **********/
