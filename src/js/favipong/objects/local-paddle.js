const Paddle = require('./paddle.js')
const Rectangle = require('../visuals/rectangle.js')
const KEYCODE_UP_ARROW = 38
const KEYCODE_DOWN_ARROW = 40

module.exports = class LocalPaddle extends Paddle {
  constructor({
    colour,
    x,
    y,
    upKey = KEYCODE_UP_ARROW,
    downKey = KEYCODE_DOWN_ARROW
  } = {}) {
    super({
      colour,
      x,
      y
    })

    this.upKey = upKey
    this.downKey = downKey

    const keydownHandler = (event) => this.onKeydown(event)
    const keyupHandler = (event) => this.onKeyup(event)

    window.addEventListener('keydown', keydownHandler)
    window.addEventListener('keyup', keyupHandler)

    this._eventCleanup = () => {
      window.removeEventListener('keydown', keydownHandler)
      window.removeEventListener('keyup', keyupHandler)
    }
  }

  destroy() {
    this._eventCleanup()

    // TODO: Disconnect from peer?
  }

  setPeer(peer) {
    // TODO: Store peer so we can pipe events to it
  }

  hit({ ball }) {
    // TODO: If we have a peer attached, then send the hit event (with paddle + ball data)

  }

  tick({ game }) {
    super.tick({ game })

    // TODO: If we have a peer, then send updated state to them

  }

  onKeydown(event) {
    switch(event.which) {
      case this.upKey:
        if(this.vy >= 0) {
          this.vy -= this.speed
        }
        break
      case this.downKey:
        if(this.vy <= 0) {
          this.vy += this.speed
        }
        break
    }
  }

  onKeyup(event) {
    switch(event.which) {
      case this.upKey:
        this.vy += this.speed
        break
      case this.downKey:
        this.vy -= this.speed
        break
    }
  }
}
