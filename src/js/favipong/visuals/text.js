const GameVisual = require('./game-visual.js')

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
