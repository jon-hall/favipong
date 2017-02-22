const GameObject = require('./game-object.js')
const Rectangle = require('../visuals/rectangle.js')
const STATES = require('../states.js')

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
    // Paddle can only move while playing
    if(game.state !== STATES.PLAYING) {
      return
    }

    this.adjustPosition({ game, elasticity: 0 })
  }
}
