const Paddle = require('./paddle.js')
const Rectangle = require('../visuals/rectangle.js')
const KEYCODE_UP_ARROW = 38
const KEYCODE_DOWN_ARROW = 40

module.exports = class RemotePaddle extends Paddle {
  constructor({
    colour,
    x,
    y
  } = {}) {
    super({
      colour,
      x,
      y
    })
  }

  // TODO: Track hit so we can compare our values with the sent values + extrapolate a correction
  // if we're out of sync...? (simply adjusting when we get a 'hit' signal will cause backwards
  // 'time jumps')

  setPeer(peer) {
    // Attach listener to update state when peer sends us data
    peer.onData((event) => this.onPeerData(event))
  }

  onPeerData(event) {
    switch(event.type) {
      case 'tick':
        // Update our position and velocity to match where the peer syas they are
        this.x = event.data.paddle.x
        this.y = event.data.paddle.y
        this.vx = event.data.paddle.vx
        this.vy = event.data.paddle.vy
        break
    }
  }
}
