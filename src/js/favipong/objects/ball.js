const GameObject = require('./game-object.js')
const Rectangle = require('../visuals/rectangle.js')

module.exports = class Ball extends GameObject {
  constructor({
    colour= 'white',
    size = 4
  } = {}) {
    const visual = new Rectangle({ fill: colour })
    super({
      visual,
      width: size,
      height: size,
      x: 14,
      y: 14,
      vx: 1,
      vy: 0.5
    })
  }

  tick({ game }) {
    const result = this.adjustPosition({ game })
    switch(result.bounceX) {
      case 1:
        game.score({ player: 1 })
        break
      case -1:
        game.score({ player: 2 })
        break
    }

    // TODO: Paddle collision detection...

  }
}
