const config = require('./config.js')
const debug = require('./debug.js')

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

// TODO: Refactor these methods up a bit - we have some duplication and just general crustiness
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
