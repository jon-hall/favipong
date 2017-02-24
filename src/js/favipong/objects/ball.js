const GameObject = require('./game-object.js')
const Paddle = require('./paddle.js')
const Rectangle = require('../visuals/rectangle.js')
const STATES = require('../states.js')
const scoringDebug = require('../../debug.js')('scoring')

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

  shouldDraw({ game }) {
    // Don't draw in any of the following states
    return [
      STATES.SEARCHING,
      STATES.COMPLETE,
      STATES.ERROR
    ].indexOf(game.state) < 0
  }

  tick({ game }) {
    // Ball can only move while playing
    if(game.state !== STATES.PLAYING) {
      return
    }

    const result = this.adjustPosition({ game })
    switch(result.bounceX) {
      case 1:
        scoringDebug('player 1 score', JSON.stringify(this))
        game.addScore({ player: 1 })
        break
      case -1:
        scoringDebug('player 2 score', JSON.stringify(this))
        game.addScore({ player: 2 })
        break
    }

    game.stage.allChildren.some(child => {
      if(child instanceof Paddle) {
        const hit = this._tryCollidePaddle(child)

        if(hit) {
          // If we hit a paddle, let the paddle know
          child.hit({ ball: this })
        }

        // Shortcut, since we can't possibly collide multiple paddles
        return hit
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

    // Adjust our y-velocity based on the paddle, to allow for 'spin'
    const adjust = Math.sign(this.vy) === Math.sign(paddle.vy) ?
      // If the paddle is moving the same direction as the ball on the y-axis, the velocity change
      // will be additive, so dampen it to prevent things getting crazy
      paddle.vy / (1 + Math.abs(this.vy)) :
      // Else, the paddle is cancelling some of our momentum, so just allow to do so wholesale
      paddle.vy

    this.vy += adjust

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
