const modConcat = require('module-concat'),
    outputFile = process.argv.indexOf('--ghp') >= 0 ? './docs/js/index.js' : './dist/app.js'

modConcat('./src/index.js', outputFile, function(err, stats) {
  if(err) {
    throw err
  }

  console.log(`${stats.files.length} were combined into ${outputFile}`)
})
