/* This header is placed at the beginning of the output file and defines the
	special `__require`, `__getFilename`, and `__getDirname` functions.
*/
(function() {
	/* __modules is an Array of functions; each function is a module added
		to the project */
var __modules = {},
	/* __modulesCache is an Array of cached modules, much like
		`require.cache`.  Once a module is executed, it is cached. */
	__modulesCache = {},
	/* __moduleIsCached - an Array of booleans, `true` if module is cached. */
	__moduleIsCached = {};
/* If the module with the specified `uid` is cached, return it;
	otherwise, execute and cache it first. */
function __require(uid, parentUid) {
	if(!__moduleIsCached[uid]) {
		// Populate the cache initially with an empty `exports` Object
		__modulesCache[uid] = {"exports": {}, "loaded": false};
		__moduleIsCached[uid] = true;
		if(uid === 0 && typeof require === "function") {
			require.main = __modulesCache[0];
		} else {
			__modulesCache[uid].parent = __modulesCache[parentUid];
		}
		/* Note: if this module requires itself, or if its depenedencies
			require it, they will only see an empty Object for now */
		// Now load the module
		__modules[uid].call(this, __modulesCache[uid], __modulesCache[uid].exports);
		__modulesCache[uid].loaded = true;
	}
	return __modulesCache[uid].exports;
}
/* This function is the replacement for all `__filename` references within a
	project file.  The idea is to return the correct `__filename` as if the
	file was not concatenated at all.  Therefore, we should return the
	filename relative to the output file's path.

	`path` is the path relative to the output file's path at the time the
	project file was concatenated and added to the output file.
*/
function __getFilename(path) {
	return require("path").resolve(__dirname + "/" + path);
}
/* Same deal as __getFilename.
	`path` is the path relative to the output file's path at the time the
	project file was concatenated and added to the output file.
*/
function __getDirname(path) {
	return require("path").resolve(__dirname + "/" + path + "/../");
}
/********** End of header **********/
/********** Start module 0: H:\Programming\favipong\src\index.js **********/
__modules[0] = function(module, exports) {
const loadScript = __require(1,0)
const debug = __require(2,0)
const firePeer = __require(3,0)

window.DEBUG = true
async function start() {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/simple-peer/6.4.3/simplepeer.min.js')
  await loadScript('https://www.gstatic.com/firebasejs/3.6.9/firebase.js')
  debug('scripts loaded!')

  const peer = await firePeer()
  alert('got peer!')
}

start()

return module.exports;
}
/********** End of module 0: H:\Programming\favipong\src\index.js **********/
/********** Start module 1: H:\Programming\favipong\src\js\script-loader.js **********/
__modules[1] = function(module, exports) {
module.exports = function(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')

    script.type = 'text/javascript'
    script.src = src
    script.onload = resolve
    script.onerror = reject

    document.head.appendChild(script)
  })
}

return module.exports;
}
/********** End of module 1: H:\Programming\favipong\src\js\script-loader.js **********/
/********** Start module 2: H:\Programming\favipong\src\js\debug.js **********/
__modules[2] = function(module, exports) {
module.exports = function(msg, ...args) {
  if(!window.DEBUG) {
    return
  }

  console.log(`[favipong] ${msg}`, args)
}

return module.exports;
}
/********** End of module 2: H:\Programming\favipong\src\js\debug.js **********/
/********** Start module 3: H:\Programming\favipong\src\js\fire-peer.js **********/
__modules[3] = function(module, exports) {
const config = __require(4,3)
const debug = __require(2,3)

async function getOffersFromFirebase() {
  const firebaseConfig = {
      apiKey: config.firebase.apiKey,
      authDomain: config.firebase.authDomain,
      databaseURL: config.firebase.databaseURL,
      storageBucket: config.firebase.storageBucket,
      messagingSenderId: config.firebase.senderId
    }
  firebase.initializeApp(firebaseConfig)

  await firebase.auth().signInAnonymously()

  const offers = await firebase.database()
    .ref('/offers')

  return offers
}
async function connectInitiator(offersRef) {
  return new Promise((resolve, reject) => {
    debug('no offers, connecting initiator peer...')

    const initiator = new SimplePeer({
      initiator: true,
      trickle: false
    })

    debug('made peer', initiator)

    initiator.on('error', (err) => {
      debug('error', err)
      reject(err)
    })

    let initOfferRef
    initiator.on('signal', async function (data) {
      debug('signal', data)

      if(data.type !== 'offer') {
        return
      }
      initOfferRef = await offersRef.push({ offer: data })
      debug('stored offer to firebase', initOfferRef)

      let isInitialValue = true
      initOfferRef.on('value', function(snapshot) {
        debug('init value')
        if(isInitialValue) {
          isInitialValue = false
          return
        }

        const val = snapshot.val()
        const counter = val && val.counter

        if(!counter) {
          return
        }

        debug('received counter', counter)
        initOfferRef.off('value')
        initiator.signal(counter)
      })
    })

    initiator.on('connect', async function () {
      debug('connect')
      await initOfferRef.remove()

      resolve(initiator)
    })
  })
}

function connectFollower(offers, offersRef) {
  return new Promise((resolve, reject) => {
    debug('offers :D', offers)

    const follower = new SimplePeer({
      initiator: false,
      trickle: false
    })
    const targetOfferId = Object.keys(offers)[0]
    follower.on('error', err => {
      debug('error (follower)', err)
      reject(err)
    })

    follower.on('signal', async function(data) {
      debug('signal (follower)', data)

      if(data.type !== 'answer') {
        return
      }
      await offersRef.child(targetOfferId).update({ counter: data })
    })

    follower.on('connect', function () {
      debug('connect (follower)')
      resolve(follower)
    })

    const targetOffer = offers[targetOfferId].offer

    debug('connecting (follower)', targetOffer)
    follower.signal(targetOffer)
  })
}

module.exports = async function connectToPeer() {
  const offersRef = await getOffersFromFirebase()
  const offersSnapshot = await offersRef.once('value')
  const offers = offersSnapshot.val()

  if(offers) {
    return await connectFollower(offers, offersRef)
  }

  return await connectInitiator(offersRef)
}

return module.exports;
}
/********** End of module 3: H:\Programming\favipong\src\js\fire-peer.js **********/
/********** Start module 4: H:\Programming\favipong\src\js\config.js **********/
__modules[4] = function(module, exports) {
module.exports = {
  firebase: {
    apiKey: 'AIzaSyDemDiurFrc9RloikuvntNcqspA4YFLI0M',
    authDomain: 'favipong.firebaseapp.com',
    databaseURL: 'https://favipong.firebaseio.com',
    storageBucket: 'favipong.appspot.com',
    senderId: '313594361579'
  }
}

return module.exports;
}
/********** End of module 4: H:\Programming\favipong\src\js\config.js **********/
/********** Footer **********/
if(typeof module === "object")
	module.exports = __require(0);
else
	return __require(0);
})();
/********** End of footer **********/
