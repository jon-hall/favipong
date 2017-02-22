const GameObject = require('./game-object.js')
const TextVisual = require('../visuals/text.js')
const STATES = require('../states.js')

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
