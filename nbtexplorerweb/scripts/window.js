
const maximize = function(jqWindowElement) {
    let el = jqWindowElement;
    el.css("top", 0);
    el.css("left", 0);
    el.css("width", "99%");
    el.css("height", "99%");
}
const unMaximize = function() {
}
const deleteElement = function(jqElement) {
    let el = jqElement;
    el.detach();
}

const relMaximize = function(e) {
    e.stopPropagation();
    e.preventDefault();
    let popWindow = e.target.parentElement.parentElement;

    console.log("Maximize button:", e.target.parentElement.parentElement);
    maximize($(e.target.parentElement.parentElement));
}
const relClose = function(e) {
    e.stopPropagation();
    e.preventDefault();
    console.log("Close button:", e.target.parentElement.parentElement);
    deleteElement($(e.target.parentElement.parentElement));
}

const reloadHandlersMaximize = function() {
    let targets = $(".window")
    for (let target of targets) {
        
        if (target instanceof Element) {
            console.log("Updating target", target)
            let header = target.children[0].children;
            console.log("Header has", header.length, "children")
            let ok = 0;
            let skip = 0;
            let matches = 0;
            let nomatches = 0;
            for (let target2 of header) {
                if (target2 instanceof Element) {
                    ok ++;
                    if (target2.className.search(/(?: |^)toolbar-button-fullscreen(?: |$)/g) > -1) {
                        matches ++;
                        console.log("Matched!", target2)
                        target2.addEventListener("click", relMaximize);
                    } else {
                        nomatches ++;
                    }
                } else {
                    skip ++;
                }
                
            }
            console.log("Done in header", target.children[0], "Valid:", ok, "Invalid:", skip, "Matched:", matches, "Didn't match:", nomatches);
        } else {
        }
        ok = 0;
        skip = 0;
        matches = 0;
        nomatches = 0;
    }
}

const reloadHandlersClose = function() {
    let targets = $(".window")
    for (let target of targets) {
        
        if (target instanceof Element) {
            console.log("Updating target", target)
            let header = target.children[0].children;
            console.log("Header has", header.length, "children")
            let ok = 0;
            let skip = 0;
            let matches = 0;
            let nomatches = 0;
            for (let target2 of header) {
                if (target2 instanceof Element) {
                    ok ++;
                    if (target2.className.search(/(?: |^)toolbar-button-close(?: |$)/g) > -1) {
                        matches ++;
                        console.log("Matched!", target2)
                        target2.addEventListener("click", relClose);
                    } else {
                        nomatches ++;
                    }
                } else {
                    skip ++;
                }
                
            }
            console.log("Done in header", target.children[0], "Valid:", ok, "Invalid:", skip, "Matched:", matches, "Didn't match:", nomatches);
        } else {
        }
        ok = 0;
        skip = 0;
        matches = 0;
        nomatches = 0;
    }
}


let preX = 0;
let preY = 0;

const dragWindow = function(e) {
    let viewportW = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    let viewportH = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    let elWindow = e.target;
    const classNameFilter = /(?:^| )window(?:$| )/gm;
    let attempts = 0;
    let parents = 0;
    while (attempts < 100) {
        if (elWindow.className.search(classNameFilter) > -1) {
            break;
        } else {
            elWindow = elWindow.parentElement;
            parents ++;
        }
    }
    let build = "Attempting";
    console.log(build);
    let jqWindow = $(elWindow);
    let windowX = jqWindow.css("left");
    let windowY = jqWindow.css("top");
    const pxFilter = /px/g
    windowX = Number(windowX.replaceAll(pxFilter, ''))
    windowY = Number(windowY.replaceAll(pxFilter, ''))
    let resultX, resultY;
    let doBorder = true;
    let checkingEntity = e.target;
    for (let k = 0; k < parents; k++) {
        checkingEntity = checkingEntity.parentElement;
    }
    if (checkingEntity.mouseHeld) {
        console.log("Check passed")
        e.stopPropagation();
        e.preventDefault();
        // console.log("move:", e.pageX, e.pageY);
        let Xdistance = e.pageX - preX;
        let Ydistance = e.pageY - preY;

        // Xpos handling
        if (windowX + Xdistance < 0) {
            resultX = 0;
            doBorder = false;
        }
        else if (windowX + Xdistance + elWindow.clientWidth > viewportW) {
            resultX = viewportW - elWindow.clientWidth
            doBorder = false;
        }
        else {
            resultX = windowX + Xdistance;
        }

        // Ypos handling
        if (windowY + Ydistance < 0) {
            resultY = 0;
            doBorder = false;
        }
        else if (windowY + Ydistance + elWindow.clientHeight > viewportH) {
            resultY = viewportH - elWindow.clientHeight;
            doBorder = false;
        }
        else {
            resultY = windowY + Ydistance;
        }

        // Should have a result here.
        console.log(resultX, resultY, "movement")
        jqWindow.css("top", resultY + "px");
        jqWindow.css("left", resultX + "px");
        if (doBorder) {
            jqWindow.addClass("bordered");
        }
        else {
            jqWindow.removeClass("bordered");
        }

        preX = e.pageX;
        preY = e.pageY;
    }
}
let windowMouseDownEvent = function(e) {
    e.stopPropagation();
    e.preventDefault();
    
}


const reloadHandlersDrag = function() {
    let targets = $(".window")
    for (let target of targets) {
        
        if (target instanceof Element) {
            console.log("Updating target", target)
            let header = target.children[0];
            header.addEventListener("mousedown", function(e) {e.target.parentElement.mouseHeld = true;e.preventDefault();preX=e.pageX;preY=e.pageY;});
            target.addEventListener("mouseup", function(e) {e.target.parentElement.mouseHeld = false;e.stopPropagation();e.preventDefault();});
            target.addEventListener("mousemove", dragWindow)
            console.log("Done...");
        } else {
        }
        ok = 0;
        skip = 0;
        matches = 0;
        nomatches = 0;
    }
}

const reloadAllHandlers = function() {
    reloadHandlersClose();
    reloadHandlersMaximize();
    reloadHandlersDrag();
}
