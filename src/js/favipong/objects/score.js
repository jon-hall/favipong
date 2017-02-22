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
    super({
      visual,
      width,
      height,
      x,
      y,
      children: [
        new Text({
          x: 1,
          y: fontY,
          width: 11,
          height: fontSize,
          colour: config.palette.player1,
          text: '0'
        }),
        new Text({
          x: 12,
          y: fontY - 2,
          width: 4,
          height: fontSize,
          colour: 'rgb(250, 250, 250)',
          text: '|'
        }),
        new Text({
          x: 16,
          y: fontY,
          width: 11,
          height: fontSize,
          colour: config.palette.player2,
          text: '0'
        })
      ]
    })

    this.scores = {
      player1: 0,
      player2: 0
    }

    this._refreshScoresText()
  }

  shouldDraw({ game }) {
    return game.state === STATES.SHOW_SCORE
  }

  _refreshScoresText() {
    this.children[0].text = `${this.scores.player1}`
    this.children[2].text = `${this.scores.player2}`
  }

  reset() {
    this.scores = {
      player1: 0,
      player2: 0
    }

    this._refreshScoresText()
  }

  addScore({ player }) {
    if(player === 1) {
      this.scores.player1++
    } else if(player === 2) {
      this.scores.player2++
    }

    this._refreshScoresText()
  }
}
