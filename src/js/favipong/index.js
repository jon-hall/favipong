const STATES = require('./states.js')
const Stage = require('./objects/stage.js')
const Ball = require('./objects/ball.js')
const LocalPaddle = require('./objects/local-paddle.js')
const RemotePaddle = require('./objects/remote-paddle.js')
const Score = require('./objects/score.js')
const ResultScreen = require('./objects/result-screen.js')
const config = require('../config.js')
const debugFactory = require('../debug.js')
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

    // TODO: Implement our 'abandon' key combo...
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

    // Prepare the game for launch by pushing the 'searching' state, then the 'paused' state
    this.pushState(STATES.SEARCHING)
    this.pushState(STATES.PAUSED)

    debug('game constructed')
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
      // Found a peer, so leave searching state
      this.popState()
      // Enter paused state while we set things up
      this.pushState(STATES.PAUSED)
      debug('_trySearch: connected')

      this.peer.onData((data) => this._onPeerData(data))

      // Now we have our peer we can reconfigure our paddles
      this._setupPaddles()
      this.scoreboard.setScoreColours(this.peer.master)

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
        // If we get this and we're master then something is fishy so ignore it
        if(this.peer.master) {
          return
        }

        serveDebug('remote:serve-sync', JSON.stringify(event.data))

        // Else, configure our serve and respond with an ack message
        this._configureServe(event.data)
        await this.peer.send({ type: 'serve-ack' })
        this._doServe()
        break

      // TODO: Handle tick/score/hit data events (some of these can be handled in the affected objects...)
      case 'score':
        if(!this._isPlayerLocal(event.data.player)) {
          // Getting a score event from the local player is clearly some kind of error...
          return
        }

        // Pop out of playing state (into paused state) while we sync scores
        while(this.state !== STATES.PAUSED) {
          this.popState()
        }
        debug('addScore:paused')

        scoreDebug('remote:score-sync', JSON.stringify(event.data))

        // Send back our ack
        await this.peer.send({ type: 'score-ack' })

        // Make sure our scores match (this is super hack proof...)
        this.scoreboard.setScores(event.data.scores)
        this._displayScores()
        break
    }
  }

  // TODO: Does the state-stack really serve a purpose in this game, seems like complexity which
  // adds nothing of value so far... (our state machine is small and the transitions fairly well
  // defined, so a stack is likely overkill)
  pushState(state) {
    this.states.push(state)
  }

  popState() {
    this.states.pop()
  }

  async addScore({ player }) {
    debug('addScore')
    if(this._isPlayerLocal(player)) {
      // When we think remote player scored, we bail, and allow their 'score' message to trigger an
      // update
      return
    }

    // Pop out of playing state (into paused state) while we sync scores
    while(this.state !== STATES.PAUSED) {
      this.popState()
    }
    debug('addScore:paused')

    // When local player scores, we send a message to our peer to inform them and wait on an ack
    try {
      await this._confirmScoreRemote({ player })
    } catch(ex) {
      // Unable to confirm, so put game in error state and bail
      this.pushState(STATES.ERROR)
      return
    }

    // We managed to confirm score update with remote - so apply update
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
    // Push into the score display state
    this.pushState(STATES.SHOW_SCORE)

    // Show the score for 1 second, reset serve, pause for 1 more second, then start again

    // TODO: Coordinate this via our peer
    // If local player scored, then send score message, await ack, then update score
    // If remote scored, await score message, then update score and respond with ack
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
    // Send a message to peer detailing score event, and the resulting scores
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
    // Wait on a 'score-ack' response
    await this.peer.onNextData((data) => data.type === 'score-ack')
    debug('_confirmScoreRemote: got ack')
  }

  async _resetServe() {
    if(!this.peer || !this.peer.master) {
      // No peer, or not master, so we don't get to configure serve
      return
    }

    await this._configureServeRemote()
    this._doServe()
  }

  async _configureServeRemote() {
    // Reset our ball, and send it's configuration to remote, then await the ack response
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
        // TODO: Paddle data too?
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

    // TODO: Configure paddles from data?  For now do a naive reset on remote/non-master
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
