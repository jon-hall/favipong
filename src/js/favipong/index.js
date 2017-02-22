const STATES = require('./states.js')
const Stage = require('./objects/stage.js')
const Ball = require('./objects/ball.js')
const LocalPaddle = require('./objects/local-paddle.js')

module.exports = class Game {
  constructor({ canvas, favicon }) {
    this.canvas = canvas
    this.context = canvas.getContext('2d')
    this.width = canvas.width
    this.height = canvas.height

    this.favicon = favicon

    // When we first start, we'll begin by searching
    this.states = [STATES.SEARCHING]

    this.reset()

    this.stage.add(new Ball())
    this.stage.add(new LocalPaddle({
      colour: 'red',
      x: 1,
      y: 7,
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
    // TODO: handle scoring
    console.log(`Player ${player} scored!`)
  }
}
