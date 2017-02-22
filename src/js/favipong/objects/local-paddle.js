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
