type BandColorSpec = {
    name: string,
    primaryColor: string,
    svgColor?: string
}

const AllColors = {
    black: {
        name: "Black",
        primaryColor: "#000000"
    } as BandColorSpec,
    brown: {
        name: "Brown",
        primaryColor: "#964b00"
    } as BandColorSpec,
    red: {
        name: "Red",
        primaryColor: "#ff4040"
    } as BandColorSpec,
    orange: {
        name: "Orange",
        primaryColor: "#ff8040"
    } as BandColorSpec,
    yellow: {
        name: "Yellow",
        primaryColor: "#ffff40"
    } as BandColorSpec,
    green: {
        name: "Green",
        primaryColor: "#b0ff40"
    } as BandColorSpec,
    blue: {
        name: "Blue",
        primaryColor: "#80b0ff"
    } as BandColorSpec,
    violet: {
        name: "Violet",
        primaryColor: "#8040ff"
    } as BandColorSpec,
    grey: {
        name: "Grey",
        primaryColor: "#bbbbbb"
    } as BandColorSpec,
    white: {
        name: "White",
        primaryColor: "#ffffff"
    } as BandColorSpec,
    gold: {
        name: "Gold",
        primaryColor: "linear-gradient(30deg, #ffffb0, #ffe0c0 90%, #ffffb0 180%)",
        svgColor: "url(#gold)"
    } as BandColorSpec,
    silver: {
        name: "Silver",
        primaryColor: "linear-gradient(45deg, #b0b0b0, #e0e0e0 90%, #b0b0b0 180%)",
        svgColor: "url(#silver)"
    } as BandColorSpec
} as const;
type AllColorsT = typeof AllColors
const nameOrder: (keyof AllColorsT)[] = [
    "black",
    "brown",
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "violet",
    "grey",
    "white",
    "gold",
    "silver"
]

const Digits: { [K in keyof AllColorsT]?: number } = {
    black: 0,
    brown: 1,
    red: 2,
    orange: 3,
    yellow: 4,
    green: 5,
    blue: 6,
    violet: 7,
    grey: 8,
    white: 9
} as const
const Multipliers: { [K in keyof AllColorsT]?: number } = {
    silver: 1e-2,
    gold: 1e-1,
    black: 1,
    brown: 1e1,
    red: 1e2,
    orange: 1e3,
    yellow: 1e4,
    green: 1e5,
    blue: 1e6,
    violet: 1e7,
    grey: 1e8,
    white: 1e9
}
const Tolerances: { [K in keyof AllColorsT]?: number } = {
    brown: 1,
    red: 2,
    orange: 0.05,
    yellow: 0.02,
    green: 0.5,
    blue: 0.25,
    violet: 0.1,
    grey: 0.01,
    silver: 10,
    gold: 5
} as const
const noTolerance = 20
const TempCoeff: { [K in keyof AllColorsT]?: string } = {
    black: "250 ppm/K",
    brown: "100 ppm/K",
    red: "50 ppm/K",
    orange: "15 ppm/K",
    yellow: "25 ppm/K",
    green: "20 ppm/K",
    blue: "10 ppm/K",
    violet: "5 ppm/K",
    grey: "1 ppm/K",
} as const

let bandCount = 4

type State = {
    digit1: keyof typeof Digits | null,
    digit2: keyof typeof Digits | null,
    digit3: keyof typeof Digits | null,
    multiplier: keyof typeof Multipliers | null,
    tol: keyof typeof Tolerances | null,
    temp: keyof typeof TempCoeff | null
}

let state: State = {
    digit1: null,
    digit2: null,
    digit3: null,
    multiplier: null,
    tol: null,
    temp: null
}

const bandModes = {
    3: ["band1", "band2", "bandMult"],
    4: ["band1", "band2", "bandMult", "bandTol"],
    5: ["band1", "band2", "band3", "bandMult", "bandTol"],
    6: ["band1", "band2", "band3", "bandMult", "bandTol", "bandTemp"]
}

const displayBandModes: { [key: number]: { [id: string]: keyof State | "none" } } = {
    3: {
        stripe1: "digit1",
        stripe2: "digit2",
        stripe3: "multiplier",
        stripe4: "none",
        stripe5: "none",
        stripe6: "none"
    },
    4: {
        stripe1: "digit1",
        stripe2: "digit2",
        stripe3: "multiplier",
        stripe4: "none",
        stripe5: "none",
        stripe6: "tol"
    },
    5: {
        stripe1: "digit1",
        stripe2: "digit2",
        stripe3: "digit3",
        stripe4: "multiplier",
        stripe5: "none",
        stripe6: "tol"
    },
    6: {
        stripe1: "digit1",
        stripe2: "digit2",
        stripe3: "digit3",
        stripe4: "multiplier",
        stripe5: "tol",
        stripe6: "temp"
    }
}
const calcExpected: { [key: number]: (keyof State)[] } = {
    3: ["digit1", "digit2", "multiplier"],
    4: ["digit1", "digit2", "multiplier", "tol"],
    5: ["digit1", "digit2", "digit3", "multiplier", "tol"],
    6: ["digit1", "digit2", "digit3", "multiplier", "tol", "temp"]
}

function sifix(number: number, space?: boolean) {
    const abs = Math.abs(number)
    const spaceChar = space ? " " : ""
    if (abs >= 1e9) {
        if (number / 1e9 % 1 == 0) return `${(number / 1e9).toFixed(0)}${spaceChar}G`
        return `${(number / 1e9).toFixed(2)}${spaceChar}G`
    }
    if (abs >= 1e6) {
        if (number / 1e6 % 1 == 0) return `${(number / 1e6).toFixed(0)}${spaceChar}M`
        return `${(number / 1e6).toFixed(2)}${spaceChar}M`
    }
    if (abs >= 1e3) {
        if (number / 1e3 % 1 == 0) return `${(number / 1e3).toFixed(0)}${spaceChar}k`
        return `${(number / 1e3).toFixed(2)}${spaceChar}k`
    }
    if (number % 1 == 0) return number.toFixed(0) + spaceChar
    return number.toFixed(2) + spaceChar
}

function calcSpan(text: string, color: string, title?: string) {
    const span = document.createElement("span")
    span.textContent = text
    span.classList.add("calculation-color")
    span.style.setProperty("--i-colorimg", color)
    if (title) span.title = title
    return span
}
function span(text: string, title?: string) {
    const span = document.createElement("span")
    span.textContent = text
    if (title) span.title = title
    return span
}

function digits(e: HTMLElement, d1: string, d2: string, d3: string | null, m: string): number {
    let digits = 0
    const digit1 = Digits[d1 as keyof typeof Digits]!
    const digit2 = Digits[d2 as keyof typeof Digits]!
    const d1_struct = AllColors[d1 as keyof AllColorsT]
    const d2_struct = AllColors[d2 as keyof AllColorsT]
    let digit3: number | null = null
    let d3_struct: BandColorSpec | null = null
    digits += digit1
    digits *= 10
    digits += digit2
    if (d3 != null) {
        digit3 = Digits[d3 as keyof typeof Digits]!
        d3_struct = AllColors[d3 as keyof AllColorsT]
        digits *= 10
        digits += digit3
    }
    const d1el = calcSpan(digit1.toString(), d1_struct.primaryColor, `${d1_struct.name}: digit: ${digit1}`)
    if (digit1 == 0) d1el.classList.add("-insignificant")
    e.appendChild(d1el)
    const d2el = calcSpan(digit2.toString(), d2_struct.primaryColor, `${d2_struct.name}: digit: ${digit2}`)
    if (digit2 == 0 && d3 != null) d2el.classList.add("-insignificant")
    e.appendChild(d2el)
    if (d3 != null) {
        const d3el = calcSpan(digit3!.toString(), d3_struct!.primaryColor, `${d3_struct!.name}: digit: ${digit3}`)
        e.appendChild(d3el)
    }
    e.appendChild(span(" x "))
    const mult = Multipliers[m as keyof typeof Multipliers]!
    const mult_struct = AllColors[m as keyof AllColorsT]
    digits *= mult
    e.appendChild(calcSpan(
        sifix(mult),
        mult_struct.primaryColor,
        `${mult_struct.name}: multiplier: ${mult}x`
    ))
    e.appendChild(span(` = ${sifix(digits, true)}Ω`))
    return digits
}
function writeTolerance(e: HTMLElement, t: string | null): number {
    const tol = t != null ? Tolerances[t as keyof typeof Tolerances]! : noTolerance
    const tol_struct: BandColorSpec = t != null ? AllColors[t as keyof AllColorsT] : {
        name: "No tolerance band",
        primaryColor: "transparent"
    }
    e.appendChild(span(" ± "))
    e.appendChild(calcSpan(tol + "%", tol_struct.primaryColor, `${tol_struct.name}: tolerance: ${tol}%`))
    return tol
}

function calculate() {
    const output = document.getElementById("output")!

    const expected = calcExpected[bandCount]
    const values = expected.map(e => state[e])
    const missing = values.includes(null)

    output.innerHTML = ""
    if (missing) {
        output.textContent = "Missing values"
        return
    }
    switch (bandCount) {
        case 3: {
            const [d1, d2, m] = values
            const ohms = digits(output, d1!, d2!, null, m!)
            const tolerance = writeTolerance(output, null)
            break
        }
        case 4: {
            const [d1, d2, m, t] = values
            const ohms = digits(output, d1!, d2!, null, m!)
            const tolerance = writeTolerance(output, t)
            break
        }
        case 5: {
            const [d1, d2, d3, m, t] = values
            const ohms = digits(output, d1!, d2!, d3!, m!)
            const tolerance = writeTolerance(output, t)
            break
        }
        case 6: {
            const [d1, d2, d3, m, t, temp] = values
            const ohms = digits(output, d1!, d2!, d3!, m!)
            const tolerance = writeTolerance(output, t)
            break
        }
    }
}

function render() {
    const displayMode = displayBandModes[bandCount]
    for (const [id, key] of Object.entries(displayMode)) {
        const el = document.getElementById(id)!
        if (key == "none") {
            el.style.fill = "transparent"
        } else {
            const color = state[key]
            if (color == null || color == undefined) {
                el.style.fill = "transparent"
            } else {
                el.style.fill = AllColors[color].svgColor ?? AllColors[color].primaryColor
            }
        }
    }
    calculate()
}

function constructOptions(element: HTMLElement, name: string, headerText: string, bands: { [K in keyof AllColorsT]?: any }, onChangeHandler: (event: Event) => void) {
    const header = document.createElement("h3")
    header.textContent = headerText
    const pickArry = document.createElement("div")
    pickArry.classList.add("picker-array")
    for (const k of nameOrder) {
        if (bands[k] == undefined) continue
        const info = AllColors[k]
        const picker = document.createElement("label");
        picker.htmlFor = `${name}_input_${k}`
        picker.classList.add("pick")
        picker.classList.add("pick-color")

        const button = document.createElement("input");
        button.type = "radio"
        button.name = `${name}_input`
        button.id = `${name}_input_${k}`
        button.value = k
        button.classList.add("pick-input")
        button.addEventListener("change", onChangeHandler)

        const spacer = document.createElement("div")
        spacer.style.flexGrow = "1"

        const swatch = document.createElement("div");
        swatch.classList.add("-swatch")
        swatch.style.setProperty("--swatch-color", info.primaryColor)

        const text = document.createElement("div")
        text.textContent = info.name
        text.classList.add("-text")

        picker.appendChild(button)
        picker.appendChild(swatch)
        picker.appendChild(text)
        picker.appendChild(spacer)

        pickArry.appendChild(picker)
    }

    element.appendChild(header)
    element.appendChild(pickArry)
}


function onBandCountChanged(event: { target: EventTarget | null }) {
    const target = event.target as HTMLInputElement
    if (!target.checked) return
    const newCount = +target.value!
    bandCount = newCount
    if (newCount < 3 || newCount > 6) {
        throw new Error("Invalid band count")
    }
    const enabled = bandModes[newCount as keyof typeof bandModes]
    for (const mode of ["band1", "band2", "band3", "bandMult", "bandTol", "bandTemp"]) {
        const el = document.getElementById(mode)!
        el.style.display = enabled.includes(mode) ? "block" : "none"
    }
    render()
}

function clear() {
    document.querySelectorAll(".clear-within").forEach(e => {
        e.querySelectorAll("input[type=radio]:checked").forEach(e => {
            ; (e as HTMLInputElement).checked = false
        })
    })
    state.digit1 = null
    state.digit2 = null
    state.digit3 = null
    state.multiplier = null
    state.tol = null
    state.temp = null
    render()
}

window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".band-count-input").forEach((el) => {
        const htmlEl = el as HTMLInputElement
        htmlEl.addEventListener("change", onBandCountChanged)
        if (htmlEl.checked) {
            onBandCountChanged({ target: el })
        }
    })

    document.getElementById("clear")!.addEventListener("click", clear)

    constructOptions(document.getElementById("band1")!, "band1", "Digit 1", Digits, event => {
        const target = event.target as HTMLInputElement
        if (target.checked) state.digit1 = target.value as keyof typeof Digits
        else state.digit1 = null
        render()
    })
    constructOptions(document.getElementById("band2")!, "band2", "Digit 2", Digits, event => {
        const target = event.target as HTMLInputElement
        if (target.checked) state.digit2 = target.value as keyof typeof Digits
        else state.digit2 = null
        render()
    })
    constructOptions(document.getElementById("band3")!, "band3", "Digit 3", Digits, event => {
        const target = event.target as HTMLInputElement
        if (target.checked) state.digit3 = target.value as keyof typeof Digits
        else state.digit3 = null
        render()
    })
    constructOptions(document.getElementById("bandMult")!, "bandMult", "Multiplier", Multipliers, event => {
        const target = event.target as HTMLInputElement
        if (target.checked) state.multiplier = target.value as keyof typeof Multipliers
        else state.multiplier = null
        render()
    })
    constructOptions(document.getElementById("bandTol")!, "bandTol", "Tolerance", Tolerances, event => {
        const target = event.target as HTMLInputElement
        if (target.checked) state.tol = target.value as keyof typeof Tolerances
        else state.tol = null
        render()
    })
    constructOptions(document.getElementById("bandTemp")!, "bandTemp", "Temperature Coefficent", TempCoeff, event => {
        const target = event.target as HTMLInputElement
        if (target.checked) state.temp = target.value as keyof typeof TempCoeff
        else state.temp = null
        render()
    })
    render()
})