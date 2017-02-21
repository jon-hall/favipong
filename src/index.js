const loadScript = require('./js/script-loader.js')

async function start() {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/simple-peer/6.4.3/simplepeer.min.js')
  await loadScript('https://www.gstatic.com/firebasejs/3.6.9/firebase.js')
  alert('scripts loaded!')
}

start()
