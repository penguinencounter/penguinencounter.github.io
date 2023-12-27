// THIS IS A WORKER SCRIPT :D
// globals are actually WorkerGlobalScope / WindowOrWorkerGlobalScope
// Remember, the only way out of here is postMessage(), and the only way in is onmessage()
// (well, there's also FetchEvent but who would use that for communication?)

/**
 * Rules for postMessage():
 * - no Functions
 * - no DOM elements (maybe use an object as a proxy, have the main script parse the effects?)
 * - RegExps will be rewound (lastIndex set to 0)
 * - Everything is read/write
 * - Prototypes are not transferred
 * - If you need to send an ArrayBuffer or other low-level data, transfer it
 *     - warning! the data will be unusable in the source context after transfer!
 */
onmessage = function(e) {
    console.log(`Message received from main script: ${e.data}`)
}
