/* File IO related functions */
function loadFile(input) {
    let file = input.files[0];

    let reader = new FileReader();

    reader.readAsText(file);

    reader.onload = function () {
        console.log(reader.result);
    };

    reader.onerror = function () {
        console.log(reader.error);
    };
}

function saveFile(json) {
    var a = document.createElement("a")
    a.href = URL.createObjectURL(
        new Blob([json], { type: "application/json" })
    )
    a.download = "myFile.json"
    a.click()
}