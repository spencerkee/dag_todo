/* File IO related functions */
function loadFile(input) {
    let file = input.files[0];

    let reader = new FileReader();

    reader.readAsText(file);

    reader.onload = function () {
        g = graphFromJson(reader.result);
        updateGraph();
    };

    reader.onerror = function () {
        console.log(reader.error);
    };
}

function saveFile() {
    json = graphToJson();
    var a = document.createElement("a")
    a.href = URL.createObjectURL(
        new Blob([json], { type: "application/json" })
    )
    let now = new Date();
    a.download = `todo-${now.toISOString()}.json`
    a.click()
}