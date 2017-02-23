const STATES = require('./states.js')
const Stage = require('./objects/stage.js')
const Ball = require('./objects/ball.js')
const LocalPaddle = require('./objects/local-paddle.js')
const RemotePaddle = require('./objects/remote-paddle.js')
const Score = require('./objects/score.js')
const config = require('../config.js')

module.exports = class Game {
  constructor({ canvas, favicon, firepeer }) {
    this.canvas = canvas
    this.context = canvas.getContext('2d')
    this.width = canvas.width
    this.height = canvas.height

    this.favicon = favicon

    this.peer = firepeer

    this.states = []

    this.reset()

    this.ball = new Ball()
    this.stage.add(this.ball)

    this.localPaddle = new LocalPaddle({
      colour: config.palette.player1,
      x: 1,
      y: 8,
    })
    this.stage.add(this.localPaddle)

    this.remotePaddle = new RemotePaddle({
      colour: config.palette.player2,
      x: 24,
      y: 8,
    })
    this.stage.add(this.remotePaddle)

    this.scoreboard = new Score()
    this.stage.add(this.scoreboard)

    // Prepare the game for launch by pushing the 'searching' state, then the 'paused' state
    this.pushState(STATES.SEARCHING)
    this.pushState(STATES.PAUSED)
  }

  get state() {
    // Get top-most state on stack, or default to paused
    return this.states[this.states.length - 1] || STATES.PAUSED
  }

  start() {
    this.popState()

    if(this.__running) {
      return
    }

    // Naive 15fps game loop :D
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

    this._searching = true
    try {
      await this.peer.connect()

      this.peer.onData((data) => this._onPeerData(data))

      // Now we have our peer we can reconfigure our paddles
      this._setupPaddles()

      // Then setup a serve
      await this._resetServe()

      // And start the point
      this._doServe()
    } catch(ex) {
      // Searching died, stop seraching and enter error state
      this.popState()
      this.pushState(STATES.ERROR)
    }
  }

  _setupPaddles() {
    this.localPaddle.setPeer(this.peer)
    this.remotePaddle.setPeer(this.peer)

    // Setup localPaddle + remote paddle appropriately
    if(this.peer.master) {
      this._setupPaddle1(this.localPaddle)
      this._setupPaddle2(this.remotePaddle)
      return
    }

    this._setupPaddle1(this.remotePaddle)
    this._setupPaddle2(this.localPaddle)
  }

  _setupPaddle1(paddle) {
    paddle.fill = config.palette.player1
    paddle.x = 1
    paddle.y = 8
  }

  _setupPaddle2(paddle) {
    paddle.fill = config.palette.player2
    paddle.x = 24
    paddle.y = 8
  }

  _onPeerData(data) {
    switch(data.type) {
      case 'serve':
        this._serveSyncData = data.data
        break

      // TODO: Handle tick/score/hit data events (some of these can be handled in the affected objects...)

    }
  }

  pushState(state) {
    this.states.push(state)
  }

  popState() {
    this.states.pop()
  }

  addScore({ player }) {
    this.scoreboard.addScore({ player })

    // Pop out of playing state (into paused state)
    this.popState()

    // Push into the score display state
    this.pushState(STATES.SHOW_SCORE)

    // Show the score for 1 second, reset serve, pause for 1 more second, then start again
    // TODO: This is crude and probably has synchronisation issues...
    // But then again, the whole network-sync thing is currently being ignored, so will deal with
    // if/when I address that...
    setTimeout(async () => {
      this.popState()

      await this._resetServe()

      this._doServe()
    }, 1000)
  }

  _doServe() {
    setTimeout(() => {
      this.pushState(STATES.PLAYING)
      this._serveSyncData = null
    }, 1000)
  }

  async _resetServe(resetPaddles = true) {
    this.ball.reset()

    if(resetPaddles) {
      this._setupPaddles()
    }

    // Sync ball state from master to non-master
    if(this.peer.master) {
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

      await this.peer.onNextData((data) => data.type === 'serve-ack')
    }

    // If we haven't already got sync info from master, then wait for it
    if(!this._serveSyncData) {
      await this.peer.onNextData((data) => data.type === 'serve')
    }

    await this._syncServe()
  }

  async _syncServe() {
    this.ball.x = this._serveSyncData.ball.x
    this.ball.y = this._serveSyncData.ball.y
    this.ball.vx = this._serveSyncData.ball.vx
    this.ball.vy = this._serveSyncData.ball.vy

    this._serveSyncData = null

    await this.peer.send({ type: 'serve-ack' })
  }
}
