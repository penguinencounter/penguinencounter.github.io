// Handles content replacement and data management.

; (function () {
    const autoloadSize = 50000  // automatically load content less than 50 kb
    // const autoloadSize = 50000000  // automatically load content less than 50 mb

    const APPLY_TAG = "content-replacement-stats-applied"
    const CR_USED_TAG = "content-replacement-used"
    function assert(yes: boolean, message?: string) {
        if (!yes) {
            if (message)
                throw Error(`Assertion failed: ${message}`)
            else
                throw Error(`Assertion failed.`)
        }
    }

    async function progFetch(target: URL | RequestInfo, options: {
        fetchopt?: RequestInit,
        progress?: ((read: number, total: number | null) => Promise<boolean>)
    }) {
        const callback = options.progress || (async (_1, _2) => true)
        const collect = new Uint8Array()
        const resp = await fetch(target, options.fetchopt)

        let total_ = resp.headers.get('Content-Length')
        let total: number | null
        if (total_ != null) total = parseInt(total_)
        else total = null

        if (resp.body == null) return await resp.blob()

        async function readAll(strm: ReadableStream<Uint8Array>) {
            const reader = strm.getReader()
            const chunks: Uint8Array[] = []

            let recieved = 0

            let value: Uint8Array | undefined, done: boolean
            while (true) {
                ({value, done} = await reader.read())
                if (done) {
                    return chunks
                }
                chunks.push(value!)
                recieved += value!.length
                if (!await callback(recieved, total)) {
                    await strm.cancel()
                    return chunks
                }
            }
        }

        const chunkedData = await readAll(resp.body)
        // collect all the data together into a Blob
        const data = new Uint8Array(chunkedData.reduce((acc, cur) => acc + cur.length, 0))
        let offset = 0
        for (const chunk of chunkedData) {
            data.set(chunk, offset)
            offset += chunk.length
        }
        return new Blob([data])
    }

    function siBytes(bytes: number) {
        const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB"]
        let unitIndex = 0
        while (bytes > 1000) {
            bytes /= 1000
            unitIndex++
        }
        return `${bytes.toFixed(2)} ${units[unitIndex]}`
    }

    function loadReplacedImage(templateElement: HTMLElement) {
        if (templateElement.classList.contains(CR_USED_TAG)) return // here we go again
        // freeze the current size of the element, prevent recursion issues
        templateElement.classList.add(CR_USED_TAG)

        const dataTarget = document.createElement("img")
        let source: string | null = null
        for (const key of templateElement.attributes) {
            if (!key.name.startsWith("data-img-")) continue
            const trueName = key.name.replace(/^data-img-/g, "")
            if (trueName.toLowerCase() == "src") {
                source = key.value
            } else {
                dataTarget.setAttribute(trueName, key.value)
            }
        }
        if (source == null) throw Error("image has no source???")
        // is the source already data:...?
        const fin = () => templateElement.replaceWith(dataTarget)
        if (source.startsWith("data:")) {
            dataTarget.src = source
            fin()
            return
        }
        const callto = templateElement.querySelector(".replaced-info ._c2a")
        if (callto instanceof HTMLElement) {
            callto.innerText = "Loading..."
        } else {
            console.warn("no c2a element?")
        }

        // do the request in the background
        progFetch(source, {
            progress: async (read, total) => {
                if (total == null) {
                    if (callto instanceof HTMLElement) {
                        callto.innerText = `${siBytes(read)} recieved`
                    }
                } else {
                    const percentage = Math.floor((read / total) * 100)
                    if (callto instanceof HTMLElement) {
                        if (percentage == 100) callto.innerText = "Download finishing..."
                        else callto.innerText = `${siBytes(read)} / ${siBytes(total)} ${percentage}%`
                    }
                }
                return true
            }
        }).then(async (blob) => {
            dataTarget.src = URL.createObjectURL(blob)
            if (callto instanceof HTMLElement) {
                callto.innerText = "Preparing image"
            }
            await dataTarget.decode()
            fin()
        }).catch((err) => {
            console.error(err)
            if (callto instanceof HTMLElement) {
                callto.innerText = "Failed to load"
            }
        })
    }

    function statImage(source: HTMLElement, templateElement: HTMLElement) {
        const size = document.createElement("div")
        const sizeof = source.dataset.contentSize ? parseInt(source.dataset.contentSize) : 0
        if (sizeof > 0) {
            size.innerText = `${siBytes(sizeof)} image`
        } else {
            size.innerText = "???B image"
        }
        size.classList.add("_size")
        templateElement.appendChild(size)
        if ("width" in source.dataset && "height" in source.dataset && "format" in source.dataset) {
            const isize = document.createElement("div")
            isize.classList.add("_isize")
            isize.innerText = `${source.dataset.width}x${source.dataset.height} ${source.dataset.format}`
            templateElement.appendChild(isize)
        }
    }

    const observeOptions: MutationObserverInit = {
        childList: true,
        subtree: true
    } as const

    function tag(e: HTMLElement, loadImmediate: boolean = false) {
        if (e.classList.contains(APPLY_TAG)) return
        const dataContainer = document.createElement("div")
        dataContainer.classList.add("replaced-info")
        // display stats
        switch (e.dataset.replacementType) {
            case "img":
                statImage(e, dataContainer)
                break
            default:
                console.warn(`unknown replacement type: ${e.dataset.replacementType}`)
                break
        }

        const c2a = document.createElement("div")
        c2a.classList.add("_c2a")
        c2a.innerText = "Click to load"  // TODO: i18n
        dataContainer.appendChild(c2a)

        e.appendChild(dataContainer)
        e.classList.add(APPLY_TAG)

        if (!loadImmediate) {
            e.addEventListener("click", function k(ev) {
                this.removeEventListener("click", k)
                load(e)
            })
        }
    }

    function load(e: HTMLElement) {
        assert('replacementType' in e.dataset)
        switch (e.dataset.replacementType) {
            case "img":
                loadReplacedImage(e)
                break
            default:
                console.warn(`unknown replacement type: ${e.dataset.replacementType}`)
                break
        }
    }

    let isRefreshInProgress = false

    function processMedia() {
        if (isRefreshInProgress) return // prevent recursion from mutation observer when we replace the content
        isRefreshInProgress = true
        document.querySelectorAll(".replaced").forEach(e => {
            if (e instanceof HTMLElement) {
                assert('contentSize' in e.dataset)
                assert('replacementType' in e.dataset)
                if (parseInt(e.dataset.contentSize!) <= autoloadSize) {
                    // load the content now
                    tag(e, true)
                    load(e)
                } else {
                    tag(e, false)
                }
            }
        })
        isRefreshInProgress = false
    }

    const observeCallback: MutationCallback = (mutationList, observer) => {
        processMedia()
    }

    window.addEventListener("DOMContentLoaded", () => {
        // initial loading pass...
        processMedia()
        // look to the future
        const observer = new MutationObserver(observeCallback)
        observer.observe(document.body, observeOptions)
    })
})()
