const GameObject = require('./game-object.js')
const Paddle = require('./paddle.js')
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

    const xOverlap = x1 <= px1 ?
      x2 <= px1 ?
        // Ball is totally left of paddle
        0 :
        // Ball has hit left side of paddle (store overlap as positive)
        x2 - px1 :
      x1 >= px2 ?
        // Ball is totally right of paddle
        0 :
        // Ball has hit paddle on right (store overlap as negative)
        x1 - px2

    const yOverlap = y1 <= py1 ?
      y2 <= py1 ?
        // Ball is totally above paddle
        0 :
        // Ball has hit top of paddle (store overlap as positive)
        y2 - py1 :
      y1 >= py2 ?
        // Ball is totally below paddle
        0 :
        // Ball has hit paddle on bottom (store overlap as negative)
        py2 - y1

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
    this.x -= xOverlap

    // Invert our x-velocity
    this.vx *= -1

    return true
  }
}
