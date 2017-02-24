module.exports = function(type) {
  return function(msg, ...args) {
    if(!window.DEBUG || (typeof window.DEBUG === 'string' && window.DEBUG.split(';').indexOf(type) < 0)) {
      return
    }

    console.log(`[favipong] (${type}) ${msg}`, ...args)
  }
}
