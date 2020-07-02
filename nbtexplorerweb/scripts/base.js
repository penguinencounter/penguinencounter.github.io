var reader, data;
var onLoad = function() {
    var inputElement = document.getElementById("importer");
    var button = document.getElementById("impbutton");
    console.log(inputElement);
    inputElement.addEventListener("change", handleFiles, false);
    button.addEventListener("click", beginUpload)
}
var handleFiles = function () {
    var resultElement = document.getElementById("result");
    var file = this.files[0];
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


String.prototype.decodeEscapeSequence = function() {
    return this.replace(/\\x([0-9A-Fa-f]{2})/g, function() {
        return String.fromCharCode(parseInt(arguments[1], 16));
    });
};