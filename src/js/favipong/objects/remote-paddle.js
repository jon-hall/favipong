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

  destroy() {
    // TODO: Disconnect from peer?
  }

  setPeer(peer) {
    // TODO: Attach event listener to update state when peer sends us data
  }
}
