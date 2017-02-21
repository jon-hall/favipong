module.exports = function(msg, ...args) {
  if(!window.DEBUG) {
    return
  }

  console.log(`[favipong] ${msg}`, args)
}
