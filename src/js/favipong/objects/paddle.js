const GameObject = require('./game-object.js')
const Rectangle = require('../visuals/rectangle.js')

module.exports = class Paddle extends GameObject {
  constructor({
    colour,
    x,
    y,
    width = 3,
    height = 12,
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
