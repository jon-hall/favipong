class View {
  constructor(canvas, favicon) {
    this.canvas = document.createElement('canvas')
    this.ctx = canvas.getContext('2d')
    this.favicon = favicon

    this.objects = []
    this.width = canvas.width
    this.height = canvas.height
  }

  add(object) {
    this.objects.push(object)
  }

  start() {
    if(this.__handle) {
      return
    }

    this.__handle = setInterval(() => this._draw(), 50)
  }

  stop() {
    clearInterval(this.__handle)
    this.__handle = null
  }

  _draw() {
    // clear the canvas
    this.ctx.fillStyle = 'black'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // render all objects
    this.objects.forEach((object) => object.draw(this.ctx, this.canvas))

    // tick all objects
    this.objects.forEach((object) => object.tick(this.game))

    // store to favicon
    this.favicon.href = this.canvas.toDataURL()
  }
}

class Rect {
  constructor(x, y, width, height, fill) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.fill = fill
  }

  draw(context) {
    context.fillStyle = this.fill
    context.fillRect(this.x, this.y, this.width, this.height)
  }
}

class Ball {
  static create(x, y, size, fill) {
    return new Ball(new Rect(x, y, size, size, fill))
  }

  constructor(visual) {
    this.visual = visual
    this.vx = 0
    this.vy = 0
  }

  draw(context) {
    return this.visual.draw(context)
  }

  tick(game) {
    const view = game.view

    this.visual.x += this.vx
    this.visual.y += this.vy

    // bounds checks
    const rightmost = this.visual.x + this.visual.width,
      bottommost = this.visual.y + this.visual.height

    if(rightmost >= view.width) {
      this.vx = -this.vx
      this.visual.x = view.width - (rightmost - view.width)
    } else if(this.visual.x < 0) {
      this.vx = -this.vx
      this.visual.x = -this.visual.x
    }

    if(bottommost >= view.height) {
      this.vy = -this.vy
      this.visual.y = view.height - (bottommost - view.height)
    } else if(this.visual.y < 0) {
      this.vy = -this.vy
      this.visual.y = -this.visual.y
    }
  }
}

class KeyController {
  constructor(up, down) {
    this.up = false
    this.down = false

    window.addEventListener('keydown', (event) => {
      switch(event.key) {
        case up:
          this.up = true
          break
        case down:
          this.down = true
          break
      }
    })

    window.addEventListener('keyup', (event) => {
      switch(event.key) {
        case up:
          this.up = false
          break
        case down:
          this.down = false
          break
      }
    })
  }
}

class Paddle {
  static create(x, y, width, height, fill, up, down) {
    return new Paddle(new Rect(x, y, width, height, fill), new KeyController(up, down))
  }

  constructor(visual, controller) {
    this.visual = visual
    this.controller = controller
  }

  draw(context) {
    return this.visual.draw(context)
  }

  tick(game) {
    if(this.controller.up) {
      this.visual.y = Math.max(0, this.visual.y - 1)
    } else if(this.controller.down) {
      this.visual.y = Math.min(game.view.height - this.visual.height, this.visual.y + 1)
    }
  }
}

class Game {
  static create(canvas) {
    const view = new View(canvas),
      ball = Ball.create(10, 0, 4, 'white'),
      paddleA = Paddle.create(1, 7, 2, 12, 'rgb(255, 0, 0)', 'q', 'a'),
      paddleB = Paddle.create(25, 7, 2, 12, 'rgb(0, 255, 0)', 'p', 'l')

    return new Game(view, ball, paddleA, paddleB)
  }

  constructor(view, ball, paddleA, paddleB) {
    this.view = view
    this.ball = ball
    this.paddleA = paddleA
    this.paddleB = paddleB

    view.game = this
    view.add(paddleA)
    view.add(paddleB)
    view.add(ball)

    this.speed = 1
  }

  play() {
    this._reset()
    this.view.start()
  }

  _reset() {
    this.ball.visual.x = this.ball.visual.y = 13
    this.ball.vy = 0
    this.ball.vx = Math.random() > 0.5 ? this.speed : -this.speed
  }
}

const canvas = document.createElement('canvas')
canvas.width = canvas.height = 28

if(!window.DEBUG) {
  canvas.style.display = 'none'
}

const game = Game.create(canvas, document.querySelector('#favicon'))
game.play()
