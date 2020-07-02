var reader, data;
let dropbox;
var onLoad = function() {
    var inputElement = document.getElementById("importer");
    var button = document.getElementById("impbutton");
    console.log(inputElement);
    inputElement.addEventListener("change", handleFiles, false);
    button.addEventListener("click", beginUpload)

    dropbox = button;
    dropbox.addEventListener("dragenter", dragEnter, false);
    dropbox.addEventListener("dragover", dragOver, false);
    document.addEventListener("dragenter", dragOverPage, false);
    dropbox.addEventListener("drop", drop, false);
}
var handleFiles = function () {
    var resultElement = document.getElementById("result");
    var file = this.files[0];
    console.log(file);
    reader = new FileReader();
    reader.onload = (function(element) {return function(e) {data = e.target.result;setTimeout(completeUpload, 10)}; })(resultElement);
    reader.readAsBinaryString(file);
}
var handleFilesDrop = function (files) {
    var resultElement = document.getElementById("result");
    var file = files[0];
    console.log(file);
    reader = new FileReader();
    reader.onload = (function(element) {return function(e) {data = e.target.result;setTimeout(completeUpload, 10)}; })(resultElement);
    reader.readAsBinaryString(file);
}
var beginUpload = function (e) {
    var inputElement = document.getElementById("importer");
    inputElement.click();
}
var completeUpload = function () {
    var e = document.getElementById("impbutton");
    e.value = "Processing files...";
    e.className = "working";
    document.getElementById("result").innerHTML = data;
    console.log(data.decodeEscapeSequence())
    setTimeout(resetButton, 3000);
}
var resetButton = function() {
    var e = document.getElementById("impbutton");
    e.value = "Import files";
    e.className = "idle";
}

const dragEnter = function (e) {
    console.log("dragEnter")
    e.stopPropagation();
    e.preventDefault();
}
const dragOver = function (e) {
    console.log("dragOver")
    e.stopPropagation();
    e.preventDefault();

}
const dragOverPage = function (e) {
    console.log("dragOverPage")
    e.stopPropagation();
    e.preventDefault();
    let button = document.getElementById("impbutton");
    button.value = "Drop files here!";
}

const drop = function (e) {
    console.log("DROP")
    e.stopPropagation();
    e.preventDefault();
    
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFilesDrop(files);
}


String.prototype.decodeEscapeSequence = function() {
    return this.replace(/\\x([0-9A-Fa-f]{2})/g, function() {
        return String.fromCharCode(parseInt(arguments[1], 16));
    });
};