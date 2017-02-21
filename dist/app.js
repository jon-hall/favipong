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

async function start() {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/simple-peer/6.4.3/simplepeer.min.js')
  await loadScript('https://www.gstatic.com/firebasejs/3.6.9/firebase.js')
  alert('scripts loaded!')
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
/********** Footer **********/
if(typeof module === "object")
	module.exports = __require(0);
else
	return __require(0);
})();
/********** End of footer **********/
