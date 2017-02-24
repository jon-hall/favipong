const config = require('./config.js')
const debug = require('./debug.js')('firepeer')

module.exports = class FirePeer {
  async connect() {
    debug('firepeer:connect')
    if(this.peer) {
      return
    }

    const connection = await connectToPeer()
    this.peer = connection.peer
    this.master = connection.master

    this.handlers = []

    this.peer.on('error', console.error)
    this.peer.on('close', () => console.error('peer closed'))
    this.peer.on('data', (data) => this._onData(data))
  }

  async disconnect() {
    debug('firepeer:disconnect')
    if(!this.peer) {
      return
    }

    await new Promise((resolve) => this.peer.destroy(resolve))
    this.peer = null
  }

  async send(data) {
    // debug('firepeer:send')
    if(!this.peer) {
      throw new Error('not connected')
    }

    await this.peer.send(JSON.stringify(data))
  }

  _onData(data) {
    const parsed = JSON.parse(data)
    const remove = []

    this.handlers.forEach((handler) => {
      let passed = true

      if(typeof handler.test === 'function') {
        passed = handler.test(parsed)
      }

      if(!passed) {
        return
      }

      if(handler.once) {
        remove.push(handler)
      }

      handler.fn(parsed)
    })

    remove.forEach((removed) => this._removeHandler(removed))
  }

  _removeHandler(handler) {
    const index = this.handlers.indexOf(handler)

    if(index >= 0) {
      this.handlers.splice(index, 1)
      return true
    }

    return false
  }

  onData(fn) {
    debug('firepeer:onData')
    if(!this.peer) {
      throw new Error('not connected')
    }

    this.handlers.push({ fn })
  }

  async onNextData(test, timeout = 500) {
    debug('firepeer:onNextData')
    return new Promise((resolve, reject) => {
      const handler = {
        fn: resolve,
        once: true,
        test
      }

      this.handlers.push(handler)

      setTimeout(() => {
        if(this._removeHandler(handler)) {
          reject('timeout')
        }
      }, timeout)
    })
  }
}

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

// TODO: Proper handling of open offers for disconnected peers (offer expiry/retry on conect fail etc.)
// BACKLOG: Refactor these methods up a bit - we have some duplication and just general crustiness
// (also bring them into the FirePeer class...)
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

      // Store offer to firebase...
      initOfferRef = await offersRef.push({ offer: data })
      debug('stored offer to firebase', initOfferRef)

      let isInitialValue = true
      initOfferRef.on('value', async function(snapshot) {
        debug('init value')
        if(isInitialValue) {
          // Ignore the initial value
          isInitialValue = false
          return
        }

        const val = snapshot.val()
        const counter = val && val.counter

        if(!counter) {
          return
        }

        debug('received counter', counter)

        // remove our offer from firebase, so it doesn't interfere with other users
        await initOfferRef.remove()

        // we've completed our offer-counter cycle, so unsubscribe
        initOfferRef.off('value')

        // respond with counter to create a connection
        initiator.signal(counter)
      })
    })

    initiator.on('connect', async function () {
      debug('connect')

      resolve({ peer: initiator, master: true })
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

    // TODO: Handle retrying if this peer is no longer present etc.
    follower.on('error', err => {
      debug('error (follower)', err)
      reject(err)
    })

    follower.on('signal', async function(data) {
      debug('signal (follower)', data)

      if(data.type !== 'answer') {
        return
      }

      // push our counter-offer to firebase
      await offersRef.child(targetOfferId).update({ counter: data })
    })

    follower.on('connect', function () {
      debug('connect (follower)')
      resolve({ peer: follower, master: false })
    })

    const targetOffer = offers[targetOfferId].offer

    debug('connecting (follower)', targetOffer)
    follower.signal(targetOffer)
  })
}

async function connectToPeer() {
  const offersRef = await getOffersFromFirebase()
  const offersSnapshot = await offersRef.once('value')
  const offers = offersSnapshot.val()
  const filteredOffers = Object.keys(offers || {}).reduce((filtered, key) => {
    // Filter to only offers without a counter
    if(!offers[key].counter) {
      filtered[key] = offers[key]
    }

    return filtered
  }, {})

  if(Object.keys(filteredOffers).length) {
    return await connectFollower(filteredOffers, offersRef)
  }

  return await connectInitiator(offersRef)
}
