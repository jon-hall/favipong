const GameVisual = require('./game-visual.js')

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
