const STATES = require('./states.js')
const Stage = require('./objects/stage.js')
const Ball = require('./objects/ball.js')
const LocalPaddle = require('./objects/local-paddle.js')
const Score = require('./objects/score.js')
const config = require('../config.js')

module.exports = class Game {
  constructor({ canvas, favicon }) {
    this.canvas = canvas
    this.context = canvas.getContext('2d')
    this.width = canvas.width
    this.height = canvas.height

    this.favicon = favicon

    // When we first start, we'll begin by searching
    this.states = [/*STATES.SEARCHING*/]

    this.reset()

    this.ball = new Ball()
    this.stage.add(this.ball)

    // TODO: USing appropriate constructor for each player
    this.paddle1 = new LocalPaddle({
      colour: config.palette.player1,
      x: 1,
      y: 8,
    })
    this.stage.add(this.paddle1)

    this.scoreboard = new Score()
    this.stage.add(this.scoreboard)
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
    this.scoreboard.addScore({ player })

    // Pop out of playing state (into paused state)
    this.popState()

    // Push into the score display state
    this.pushState(STATES.SHOW_SCORE)

    // Show the score for 1 second, reset serve, pause for 1 more second, then start again
    // TODO: This is crude and probably has synchronisation issues...
    // But then again, the whole network-sync thing is currently being ignored, so will deal with
    // if/when I address that...
    setTimeout(() => {
      this.popState()

      this._resetServe()

      setTimeout(() => {
        this.pushState(STATES.PLAYING)
      }, 1000)
    }, 1000)
  }

  _resetServe() {
    this.ball.reset()
    this.paddle1.y = 8
    this.paddle1.vy = 0

    // TODO: Reset paddle2...
  }
}
