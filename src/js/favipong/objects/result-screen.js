const GameObject = require('./game-object.js')
const Text = require('./text.js')
const Rectangle = require('../visuals/rectangle.js')
const STATES = require('../states.js')
const config = require('../../config.js')

module.exports = class Score extends GameObject {
  constructor({
    x = 0,
    y = 0,
    width = 28,
    height = 28
  } = {}) {
    const visual = new Rectangle({ fill: 'rgba(40, 40, 40, 0.7)' })

    const fontSize = 23
    const fontY = -1
    const win = new Text({
      x: 4,
      y: fontY,
      width: 20,
      height: fontSize,
      colour: config.palette.win,
      text: 'W'
    })

    const lose = new Text({
      x: 8,
      y: fontY,
      width: 20,
      height: fontSize,
      colour: config.palette.lose,
      text: 'L'
    })

    super({
      visual,
      width,
      height,
      x,
      y,
      children: [win]
    })

    this.win = win
    this.lose = lose
  }

  shouldDraw({ game }) {
    return game.state === STATES.COMPLETE
  }

  setResult(win) {
    this.children = win ? [this.win] : [this.lose]
  }
}
