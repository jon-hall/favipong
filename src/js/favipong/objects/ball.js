const GameObject = require('./game-object.js')
const Paddle = require('./paddle.js')
const Rectangle = require('../visuals/rectangle.js')
const STATES = require('../states.js')

module.exports = class Ball extends GameObject {
  constructor({
    colour= 'white',
    size = 4
  } = {}) {
    const visual = new Rectangle({ fill: colour })
    super({
      visual,
      width: size,
      height: size
    })

    this.reset()
  }

  reset() {
    this.x = 14
    this.y = 14
    // Randomly travel towards either player
    this.vx = Math.random() < 0.5 ? -1 : 1
    // Randomly travel up or down on the vertical
    this.vy = 2 * (Math.random() - 0.5)
  }

  tick({ game }) {
    // Ball can only move while playing
    if(game.state !== STATES.PLAYING) {
      return
    }

    const result = this.adjustPosition({ game })
    switch(result.bounceX) {
      case 1:
        game.score({ player: 1 })
        break
      case -1:
        game.score({ player: 2 })
        break
    }

    game.stage.allChildren.some(child => {
      if(child instanceof Paddle) {
        // Shortcut, since we can't possibly collide multiple paddles
        return this._tryCollidePaddle(child)
      }
    })
  }

  _tryCollidePaddle(paddle) {
    const x1 = this.x
    const y1 = this.y
    const x2 = x1 + this.width
    const y2 = y1 + this.height
    const px1 = paddle.x
    const py1 = paddle.y
    const px2 = px1 + paddle.width
    const py2 = py1 + paddle.height

    const xOverlap = this._getOverlap(x1, x2, px1, px2)
    const yOverlap = this._getOverlap(y1, y2, py1, py2)

    if(!xOverlap || !yOverlap) {
      // Not colliding along one axis
      return false
    }

    // Now use the overlap to adjust our position and velocities
    // TODO: Allow 'edge-hits' to work by factoring in yOverlap - for now we naively adjust the
    // same as a purely x-axis collision for cimplicity
    // TODO: Factor in paddle velocity to allow 'spin'

    // Rather than fully 'reflect' the ball off the paddle instantly, if we position it exactly on
    // the paddle it 'feels' more like a hit
    this.x += xOverlap

    // Invert our x-velocity
    this.vx *= -1

    return true
  }

  // Gets overlap between two objects along a single axis
  _getOverlap(aMin, aMax, bMin, bMax) {
    return aMin <= bMin ?
      aMax <= bMin ?
        // a is totally 'before' b
        0 :
        // a has collided with the 'min' side of b (return as a negative overlap)
        bMin - aMax :
      aMin >= bMax ?
        // a is totally 'after' b
        0 :
        // a has collided with the 'max' side of b
        bMax - aMin
  }
}
