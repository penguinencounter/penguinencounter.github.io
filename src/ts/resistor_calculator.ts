type BandColorSpec = {
    name: String,
    primaryColor: String
}

const AllColors = {
    black: {
        name: "Black",
        primaryColor: "#000000"
    },
    brown: {
        name: "Brown",
        primaryColor: "#964b00"
    },
    red: {
        name: "Red",
        primaryColor: "#ff4040"
    },
    orange: {
        name: "Orange",
        primaryColor: "#ff8040"
    },
    yellow: {
        name: "Yellow",
        primaryColor: "#ffff40"
    },
    green: {
        name: "Green",
        primaryColor: "#b0ff40"
    },
    blue: {
        name: "Blue",
        primaryColor: "#80b0ff"
    },
    violet: {
        name: "Violet",
        primaryColor: "#8040ff"
    },
    grey: {
        name: "Grey",
        primaryColor: "#bbbbbb"
    },
    white: {
        name: "White",
        primaryColor: "#ffffff"
    },
    gold: {
        name: "Gold",
        primaryColor: "linear-gradient(30deg, #ffffb0, #ffe0c0 90%, #ffffb0 180%)"
    },
    silver: {
        name: "Silver",
        primaryColor: "linear-gradient(45deg, #b0b0b0, #e0e0e0 90%, #b0b0b0 180%)"
    }
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
const Tolerances: { [K in keyof AllColorsT]?: string } = {
    brown: "1%",
    red: "2%",
    orange: "0.05%",
    yellow: "0.02%",
    green: "0.5%",
    blue: "0.25%",
    violet: "0.1%",
    grey: "0.01%",
    silver: "10%",
    gold: "5%"
} as const
const noTolerance = "20%"
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
let digit1: keyof typeof Digits | null = null
let digit2: keyof typeof Digits | null = null
let digit3: keyof typeof Digits | null = null
let multiplier: keyof typeof Multipliers | null = null
let tol: keyof typeof Tolerances | null = null
let temp: keyof typeof TempCoeff | null = null

function constructOptions(element: HTMLElement, name: string, headerText: string, bands: {[K in keyof AllColorsT]?: any}) {
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

const bandModes = {
    3: ["band1", "band2", "bandMult"],
    4: ["band1", "band2", "bandMult", "bandTol"],
    5: ["band1", "band2", "band3", "bandMult", "bandTol"],
    6: ["band1", "band2", "band3", "bandMult", "bandTol", "bandTemp"]
}


function onBandCountChanged(event: { target: EventTarget | null }) {
    const target = event.target as HTMLInputElement
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
}

window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".band-count-input").forEach((el) => {
        const htmlEl = el as HTMLInputElement
        htmlEl.addEventListener("change", onBandCountChanged)
        if (htmlEl.checked) {
            onBandCountChanged({ target: el })
        }
    })
    constructOptions(document.getElementById("band1")!, "band1", "Digit 1", Digits)
    constructOptions(document.getElementById("band2")!, "band2", "Digit 2", Digits)
    constructOptions(document.getElementById("band3")!, "band3", "Digit 3", Digits)
    constructOptions(document.getElementById("bandMult")!, "bandMult", "Multiplier band", Multipliers)
    constructOptions(document.getElementById("bandTol")!, "bandTol", "Tolerance band", Tolerances)
    constructOptions(document.getElementById("bandTemp")!, "bandTemp", "Temperature coefficent band", TempCoeff)
})