const express = require('express'),
  app = express()

app.use(express.static('dist'))
// TODO: Livereload...

app.listen(3023, function () {
  console.log('Example app listening on port 3023!')
})
