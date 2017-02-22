const GameObject = require('./game-object.js')
const Rectangle = require('../visuals/rectangle.js')

module.exports = class Stage extends GameObject {
  constructor({
    colour= 'black',
    width,
    height
  } = {}) {
    const visual = new Rectangle({ fill: colour })
    super({
      visual,
      width,
      height
    })
  }
}
