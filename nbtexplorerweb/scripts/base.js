var reader, data;
let dropbox, hint;
let importedFiles = 0;
let previousTimeout;
var onLoad = function() {
    var inputElement = document.getElementById("importer");
    var button = document.getElementById("impbutton");
    // console.log(inputElement);
    inputElement.addEventListener("change", eventUploadFile, false);
    button.addEventListener("click", beginUpload)

    dropbox = document.getElementById("filelistbutton");
    dropbox.addEventListener("dragenter", dragEnter, false);
    dropbox.addEventListener("dragover", dragOver, false);
    document.addEventListener("dragenter", dragOverPage, false);
    document.addEventListener("dragend", dragEnd, false);
    dropbox.addEventListener("drop", drop, false);

    hint = $("#hint")
    hint.hide();
    reloadAllHandlers();
}
var eventUploadFile = function() {
    handleFiles(this.files);
}
var handleFiles = function (files) {
    for (let file of files) {
        handleFile(file)
    }
    
}
var handleFile = function (file) {
    if (file instanceof Blob) {
        var resultElement = document.getElementById("result");
        importedFiles ++;
        // console.log(file);
        reader = new FileReader();
        reader.onload = (function(element) {return function(e) {data = e.target.result;setTimeout(completeUpload, 10)}; })(resultElement);
        reader.readAsBinaryString(file);
        var labelElement = document.getElementById("filelistlabel");
        if (importedFiles === 1) {
            labelElement.innerHTML = "1 file loaded";
        } else {
            labelElement.innerHTML = importedFiles + " files loaded";
        }
        var nameElement = document.getElementById("currentfile");
        nameElement.innerHTML = file.name;
    } else {
        // console.log("Skipping non-Blob", file)
    }
}
var beginUpload = function (e) {
    var inputElement = document.getElementById("importer");
    inputElement.click();
}
var completeUpload = function () {
    var e = document.getElementById("impbutton");
    e.value = "Loading files";
    e.className = "working";
    document.getElementById("result").innerHTML = data;
    // console.log(data.decodeEscapeSequence())
    clearTimeout(previousTimeout)
    previousTimeout = setTimeout(resetButton, 10);
}
var resetButton = function() {
    var e = document.getElementById("filelistbutton");
    e.src = "/nbtexplorerweb/img/FileList.png";
}

const dragEnter = function (e) {
    // console.log("dragEnter")
    e.stopPropagation();
    e.preventDefault();
}
const dragOver = function (e) {
    // console.log("dragOver")
    e.stopPropagation();
    e.preventDefault();

}
const dragEnd = function (e) {
    // console.log("dragEnd")
    // e.stopPropagation();
    e.preventDefault();
    hint.hide();
}
const dragOverPage = function (e) {
    // console.log("dragOverPage")
    e.stopPropagation();
    e.preventDefault();
    let icon = document.getElementById("filelistbutton");
    icon.src = "/nbtexplorerweb/img/ImportButton.png";
    hint.show();
}

const drop = function (e) {
    // console.log("DROP")
    e.stopPropagation();
    e.preventDefault();
    resetButton();
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFile(files[0]);
    hint.hide();
}


String.prototype.decodeEscapeSequence = function() {
    return this.replace(/\\x([0-9A-Fa-f]{2})/g, function() {
        return String.fromCharCode(parseInt(arguments[1], 16));
    });
};