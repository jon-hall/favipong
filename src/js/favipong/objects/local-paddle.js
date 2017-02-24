const Paddle = require('./paddle.js')
const Rectangle = require('../visuals/rectangle.js')
const KEY_APOSTROPHE = "'"
const KEY_FORWARD_SLASH = "/"

module.exports = class LocalPaddle extends Paddle {
  constructor({
    colour,
    x,
    y,
    upKey = KEY_APOSTROPHE,
    downKey = KEY_FORWARD_SLASH
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

    // TODO: Temp disabled
    // if(this.peer) {
    //   this.peer.disconnect()
    // }
  }

  setPeer(peer) {
    // TODO: Temp disabled
    // if(this.peer && this.peer !== peer) {
    //   // Clean up the peer we're replacing (this is async, but we don't need to wait on it...do we?)
    //   this.peer.disconnect()
    // }

    this.peer = peer
  }

  hit({ ball }) {
    // TODO: If we have a peer attached, then send the hit event (with paddle + ball data)
    if(!this.peer) {
      return
    }

    // Send our peer paddle and ball data to force a sync after a hit
    this.peer.send({
      type: 'hit',
      data: {
        paddle: {
          x: this.x,
          y: this.y,
          vx: this.vx,
          vy: this.vy
        },
        ball: {
          x: ball.x,
          y: ball.y,
          vx: ball.vx,
          vy: ball.vy
        }
      }
    })
  }

  tick({ game }) {
    super.tick({ game })

    // If we have a peer, then send updated state to them
    if(!this.peer) {
      return
    }

    this.peer.send({
      type: 'tick',
      data: {
        paddle: {
          x: this.x,
          y: this.y,
          vx: this.vx,
          vy: this.vy
        }
      }
    })
  }

  // TODO: Update these to deal with multi-press again!
  onKeydown(event) {
    switch(event.key) {
      case this.upKey:
        this.vy = -this.speed
        break
      case this.downKey:
        this.vy = this.speed
        break
    }
  }

  onKeyup(event) {
    switch(event.key) {
      case this.upKey:
        this.vy = 0
        break
      case this.downKey:
        this.vy = 0
        break
    }
  }
}
