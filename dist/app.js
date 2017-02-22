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
/********** Start module 0: H:\Programming\favipong\src\index.js **********/
__modules[0] = function(module, exports) {
const loadScript = __require(1,0)
const debug = __require(2,0)
const firePeer = __require(3,0)

const Game = __require(4,0)
window.DEBUG = true

async function start() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 28

  if(!window.DEBUG) {
    canvas.style.display = 'none'
  }
  document.body.appendChild(canvas)

  const game = new Game({ canvas, favicon: document.querySelector('#favicon') })
  game.start()

  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/simple-peer/6.4.3/simplepeer.min.js')
  await loadScript('https://www.gstatic.com/firebasejs/3.6.9/firebase.js')
  debug('scripts loaded!')

  const peer = await firePeer()
  alert('got peer!')
}

start()

return module.exports;
}
/********** End of module 0: H:\Programming\favipong\src\index.js **********/
/********** Start module 1: H:\Programming\favipong\src\js\script-loader.js **********/
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
/********** End of module 1: H:\Programming\favipong\src\js\script-loader.js **********/
/********** Start module 2: H:\Programming\favipong\src\js\debug.js **********/
__modules[2] = function(module, exports) {
module.exports = function(msg, ...args) {
  if(!window.DEBUG) {
    return
  }

  console.log(`[favipong] ${msg}`, args)
}

return module.exports;
}
/********** End of module 2: H:\Programming\favipong\src\js\debug.js **********/
/********** Start module 3: H:\Programming\favipong\src\js\fire-peer.js **********/
__modules[3] = function(module, exports) {
const config = __require(5,3)
const debug = __require(2,3)

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
      initOfferRef.on('value', function(snapshot) {
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
        initOfferRef.off('value')
        initiator.signal(counter)
      })
    })

    initiator.on('connect', async function () {
      debug('connect')
      await initOfferRef.remove()

      resolve(initiator)
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
      resolve(follower)
    })

    const targetOffer = offers[targetOfferId].offer

    debug('connecting (follower)', targetOffer)
    follower.signal(targetOffer)
  })
}

module.exports = async function connectToPeer() {
  const offersRef = await getOffersFromFirebase()
  const offersSnapshot = await offersRef.once('value')
  const offers = offersSnapshot.val()

  if(offers) {
    return await connectFollower(offers, offersRef)
  }

  return await connectInitiator(offersRef)
}

return module.exports;
}
/********** End of module 3: H:\Programming\favipong\src\js\fire-peer.js **********/
/********** Start module 4: H:\Programming\favipong\src\js\favipong\index.js **********/
__modules[4] = function(module, exports) {
const STATES = __require(6,4)
const Stage = __require(7,4)
const Ball = __require(8,4)
const LocalPaddle = __require(9,4)

module.exports = class Game {
  constructor({ canvas, favicon }) {
    this.canvas = canvas
    this.context = canvas.getContext('2d')
    this.width = canvas.width
    this.height = canvas.height

    this.favicon = favicon
    this.states = [STATES.SEARCHING]

    this.reset()

    this.stage.add(new Ball())
    this.stage.add(new LocalPaddle({
      colour: 'orange',
      x: 24,
      y: 8,
    }))
  }

  get state() {
    return this.states[this.states.length - 1]
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

  _runLoop() {
    this.stage.tick({ game: this })

    this.stage.draw({
      game: this,
      context: this.context,
      canvas: this.canvas
    })

    this._updateFavicon()
  }

  _updateFavicon() {
    this.favicon.href = this.canvas.toDataURL()
  }

  pushState(state) {
    this.states.push(state)
  }

  popState() {
    this.states.pop()
  }

  score({ player }) {
    console.log(`Player ${player} scored!`)
  }
}

return module.exports;
}
/********** End of module 4: H:\Programming\favipong\src\js\favipong\index.js **********/
/********** Start module 5: H:\Programming\favipong\src\js\config.js **********/
__modules[5] = function(module, exports) {
module.exports = {
  firebase: {
    apiKey: 'AIzaSyDemDiurFrc9RloikuvntNcqspA4YFLI0M',
    authDomain: 'favipong.firebaseapp.com',
    databaseURL: 'https://favipong.firebaseio.com',
    storageBucket: 'favipong.appspot.com',
    senderId: '313594361579'
  }
}

return module.exports;
}
/********** End of module 5: H:\Programming\favipong\src\js\config.js **********/
/********** Start module 6: H:\Programming\favipong\src\js\favipong\states.js **********/
__modules[6] = function(module, exports) {
module.exports = {
  PAUSED: 0,
  SEARCHING: 1,
  PLAYING: 2,
  COMPLETE: 3,
  ERROR: 4
}

return module.exports;
}
/********** End of module 6: H:\Programming\favipong\src\js\favipong\states.js **********/
/********** Start module 7: H:\Programming\favipong\src\js\favipong\objects\stage.js **********/
__modules[7] = function(module, exports) {
const GameObject = __require(10,7)
const Rectangle = __require(11,7)

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
/********** End of module 7: H:\Programming\favipong\src\js\favipong\objects\stage.js **********/
/********** Start module 8: H:\Programming\favipong\src\js\favipong\objects\ball.js **********/
__modules[8] = function(module, exports) {
const GameObject = __require(10,8)
const Paddle = __require(12,8)
const Rectangle = __require(11,8)

module.exports = class Ball extends GameObject {
  constructor({
    colour= 'white',
    size = 4
  } = {}) {
    const visual = new Rectangle({ fill: colour })
    super({
      visual,
      width: size,
      height: size,
      x: 14,
      y: 14,
      vx: 1,
      vy: 0.5
    })
  }

  tick({ game }) {
    const result = this.adjustPosition({ game })
    switch(result.bounceX) {
      case 1:
        game.score({ player: 1 })
        break
      case -1:
        game.score({ player: 2 })
        break
    }

    game.stage.allChildren.some(child => {
      if(child instanceof Paddle) {
        return this._tryCollidePaddle(child)
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

    const xOverlap = x1 <= px1 ?
      x2 <= px1 ?
        0 :
        x2 - px1 :
      x1 >= px2 ?
        0 :
        x1 - px2

    const yOverlap = y1 <= py1 ?
      y2 <= py1 ?
        0 :
        y2 - py1 :
      y1 >= py2 ?
        0 :
        py2 - y1

    if(!xOverlap || !yOverlap) {
      return false
    }
    this.x -= xOverlap
    this.vx *= -1

    return true
  }
}

return module.exports;
}
/********** End of module 8: H:\Programming\favipong\src\js\favipong\objects\ball.js **********/
/********** Start module 9: H:\Programming\favipong\src\js\favipong\objects\local-paddle.js **********/
__modules[9] = function(module, exports) {
const Paddle = __require(12,9)
const Rectangle = __require(11,9)
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

  tick({ game }) {
    this.adjustPosition({ game, elasticity: 0 })
  }

  onKeydown(event) {
    switch(event.which) {
      case this.upKey:
        if(this.vy >= 0) {
          this.vy -= this.speed
        }
        break
      case this.downKey:
        if(this.vy <= 0) {
          this.vy += this.speed
        }
        break
    }
  }

  onKeyup(event) {
    switch(event.which) {
      case this.upKey:
        this.vy += this.speed
        break
      case this.downKey:
        this.vy -= this.speed
        break
    }
  }
}

return module.exports;
}
/********** End of module 9: H:\Programming\favipong\src\js\favipong\objects\local-paddle.js **********/
/********** Start module 10: H:\Programming\favipong\src\js\favipong\objects\game-object.js **********/
__modules[10] = function(module, exports) {
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
    this.children = []
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
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    })

    this.children.forEach(child => child.draw({ context, canvas }))
  }
}

return module.exports;
}
/********** End of module 10: H:\Programming\favipong\src\js\favipong\objects\game-object.js **********/
/********** Start module 11: H:\Programming\favipong\src\js\favipong\visuals\rectangle.js **********/
__modules[11] = function(module, exports) {
const GameVisual = __require(13,11)

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
/********** End of module 11: H:\Programming\favipong\src\js\favipong\visuals\rectangle.js **********/
/********** Start module 12: H:\Programming\favipong\src\js\favipong\objects\paddle.js **********/
__modules[12] = function(module, exports) {
const GameObject = __require(10,12)
const Rectangle = __require(11,12)

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
    this.adjustPosition({ game, elasticity: 0 })
  }
}

return module.exports;
}
/********** End of module 12: H:\Programming\favipong\src\js\favipong\objects\paddle.js **********/
/********** Start module 13: H:\Programming\favipong\src\js\favipong\visuals\game-visual.js **********/
__modules[13] = function(module, exports) {
module.exports = class GameVisual {
  draw({ game, context, canvas, x, y, width, height }) {
    throw new Error('draw not implemented')
  }
}

return module.exports;
}
/********** End of module 13: H:\Programming\favipong\src\js\favipong\visuals\game-visual.js **********/
/********** Footer **********/
if(typeof module === "object")
	module.exports = __require(0);
else
	return __require(0);
})();
/********** End of footer **********/
