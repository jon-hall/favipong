module.exports = class GameObject {
  constructor({
    visual,
    children = [],
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    vx = 0,
    vy = 0
  } = {}) {
    this.visual = visual
    this.children = children
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.vx = vx
    this.vy = vy
  }

  get allChildren() {
    return this.children.reduce(
      (allChildren, child) => allChildren.concat([child]).concat(child.allChildren),
      []
    )
  }

  destroy() {
    // Default destroy just recursively destroys all children
    this.children.forEach(child => child.destroy())
  }

  // TODO: Refactor out duplication in these recursive methods...
  reset() {
    // Default reset just recursively destroys all children
    this.children.forEach(child => child.reset())
  }

  add(object) {
    this.children.push(object)
  }

  // Override to determine if this object should tick, based on current game
  shouldTick({ game }) {
    return true
  }

  tick({ game }) {
    if(!this.shouldTick({ game })) {
      return
    }

    // Default tick just recursively ticks all children
    this.children.forEach(child => child.tick({ game }))
  }

  // Helper in base for ticking our position due to velocity (and bounding us within game, by default)
  adjustPosition({
    game,
    unbounded = false,
    elasticity = 1
  } = {}) {
    const adjustedX = this.x + this.vx
    const adjustedY = this.y + this.vy

    if(unbounded) {
      this.x = adjustedX
      this.y = adjustedY
      return { bounceX: 0, bounceY: 0 }
    }

    const x = this._handleOverflow(elasticity, adjustedX, this.width, 0, game.width, this.vx)
    this.x = x.position
    this.vx = x.velocity

    const y = this._handleOverflow(elasticity, adjustedY, this.height, 0, game.height, this.vy)
    this.y = y.position
    this.vy = y.velocity

    // Let callers know if we bounced off any walls
    return { bounceX: x.bounce, bounceY: y.bounce }
  }

  // Helper to deal with 'bouncing' inside the game area
  _handleOverflow(elasticity, magnitude, size, lowerLimit, upperLimit, currentVelocity) {
    let position = magnitude
    let velocity = currentVelocity
    let bounce = 0

    if(magnitude + size > upperLimit) {
      position = magnitude - ((1 + elasticity) * (magnitude + size - upperLimit))
      velocity *= -elasticity
      bounce = 1
      return { position, velocity, bounce }
    }

    if(magnitude < lowerLimit) {
      position = magnitude + ((1 + elasticity) * (lowerLimit - magnitude))
      velocity *= -elasticity
      bounce = -1
    }

    return { position, velocity, bounce }
  }

  // Override to determine if this object should draw, based on current game
  shouldDraw({ game }) {
    return true
  }

  draw({ game, context, canvas }) {
    if(!this.shouldDraw({ game })) {
      return
    }

    this.visual.draw({
      context,
      canvas,
      object: this,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    })

    this.children.forEach(child => child.draw({ game, context, canvas }))
  }
}
