const config = require('./config.js')
const debug = require('./debug.js')

module.exports = class FirePeer {
  async connect() {
    if(this.peer) {
      return
    }

    const connection = await connectToPeer()
    this.peer = connection.peer
    this.master = connection.master
  }

  async disconnect() {
    if(!this.peer) {
      return
    }

    await new Promise((resolve) => this.peer.destroy(resolve))
    this.peer = null
  }

  async send(data) {
    if(!this.peer) {
      throw new Error('not connected')
    }

    this.peer.send(JSON.stringify(data))
  }

  onData(fn) {
    if(!this.peer) {
      throw new Error('not connected')
    }

    this.peer.on('data', data => fn(JSON.parse(data)))
  }

  async onNextData(filter) {
    return new Promise((resolve) => {
      const handler = (data) => {
        const parsed = JSON.parse(data)

        if(!filter || filter(parsed)) {
          this.peer.removeListener('data', handler)
          resolve(parsed)
        }
      }

      this.peer.on('data', handler)
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
      initOfferRef.on('value', function(snapshot) {
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

        // we've completed our offer-counter cycle, so unsubscribe
        initOfferRef.off('value')

        // respond with counter to create a connection
        initiator.signal(counter)
      })
    })

    initiator.on('connect', async function () {
      debug('connect')

      // remove our offer from firebase
      await initOfferRef.remove()

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

  if(offers) {
    return await connectFollower(offers, offersRef)
  }

  return await connectInitiator(offersRef)
}
