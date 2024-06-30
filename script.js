function addNodeBtnFn() {
    if (!addNodeTextBoxEl.value) return;
    addNode(g, addNodeTextBoxEl.value);
    addNodeTextBoxEl.value = "";
    graphToLocalStorage();
    renderGraph();
    updateList();
}

function editNodeBtnFn() {
    if (!editNodeTextBoxEl.value) return;
    editNode(g, sourceNodeTextEl.innerText, editNodeTextBoxEl.value);
    graphToLocalStorage();
    renderGraph();
    // Get html element of new source node. TODO There's undoubtedly a better way of doing this.
    let newSourceNode = d3.selectAll("g.node").nodes().find(n => n.__data__ === editNodeTextBoxEl.value);
    setSourceNode(newSourceNode);
}

// TODO could probably refactor this but not very important
function updateList() {
    // Clear listEl and add g.sources() to listEl
    listEl.innerHTML = '';
    let nodesToList;
    if (sourceNodeEl === undefined) {
        nodesToList = g.sources();
    } else {
        nodesToList = getUnconnectedNodes(g, sourceNodeEl.__data__);
    }
    nodesToList.forEach(function (v) {
        let li = document.createElement('li');
        li.textContent = v;
        if (sourceNodeEl !== undefined) {
            // TODO There's got to be a better way of doing this.
            let parentButton = document.createElement('button');
            parentButton.textContent = "Add Parent";
            parentButton.onclick = function () {
                let originalSourceNodeEl = sourceNodeEl;
                let tempSourceNodeEl = d3.selectAll("g.node").nodes().find(n => n.__data__ === v);
                setSourceNode(tempSourceNodeEl);
                processNodeClick(originalSourceNodeEl.__data__, tempSourceNodeEl);
                setSourceNode(originalSourceNodeEl);
                updateList();
            };
            li.prepend(parentButton);

            let childButton = document.createElement('button');
            childButton.textContent = "Add Child";
            childButton.onclick = function () {
                let htmlNode = d3.selectAll("g.node").nodes().find(n => n.__data__ === v);
                processNodeClick(v, htmlNode);
            };
            li.prepend(childButton);
        } else {
            let selectButton = document.createElement('button');
            selectButton.textContent = "Select";
            selectButton.onclick = function () {
                let htmlNode = d3.selectAll("g.node").nodes().find(n => n.__data__ === v);
                processNodeClick(v, htmlNode);
            };
            li.prepend(selectButton);
        }
        listEl.appendChild(li);
    });
}

// TODO Move event listener logic here.
// Note that addNode recreates the node it doesn't copy over properties.
// I'll see if that's an issue later.
function addNode(graph, name) {
    graph.setNode(name, {
        label: name,
        // Round the corners of the nodes
        rx: 5,
        ry: 5,
    });
}

function editNode(graph, oldNodeName, newNodeName) {
    if (oldNodeName === newNodeName) return;
    addNode(graph, newNodeName);

    // Copy predecessor edges to new node.
    for (const predecessorName of graph.predecessors(oldNodeName)) {
        let oldEdge = graph.edge(predecessorName, oldNodeName);
        let { elem: _, ...newEdge } = oldEdge;
        graph.setEdge(predecessorName, newNodeName, newEdge);
    }
    // Copy successor edges to new node.
    for (const successorName of graph.successors(oldNodeName)) {
        // TODO possibly don't need this copy-everything-except-elem anymore because
        // it didn't fix the issue in the first place.
        let oldEdge = graph.edge(oldNodeName, successorName);
        let { elem: _, ...newEdge } = oldEdge;
        graph.setEdge(newNodeName, successorName, newEdge);
    }

    graph.removeNode(oldNodeName);
}

// Note this also clears the edit text box. I'll see if that's an issue later.
function clearSourceNode() {
    sourceNodeTextEl.innerText = "";
    sourceNodeEl = undefined;
    editNodeTextBoxEl.value = "";
    sourceNodeTextEl.style.border = "";
}

function setSourceNode(htmlNode) {
    sourceNodeTextEl.innerText = htmlNode.textContent;
    sourceNodeEl = htmlNode;
    sourceNodeTextEl.style.border = '0.25em solid red';
    editNodeTextBoxEl.value = htmlNode.textContent;
}

function processNodeClick(nodeName, htmlNode) {
    // First click with no source node set.
    if (sourceNodeEl === undefined) {
        setSourceNode(htmlNode);
        updateList();
        return;
    }
    // Self click
    if (sourceNodeEl.__data__ === nodeName) {
        // clearSourceNode();
        // updateList();
        return;
    }
    // Add edge
    g.setEdge(sourceNodeEl.__data__, nodeName);
    // clearSourceNode();
    reduceStoreRenderGraph();
    updateList();
}

function nodeClickListener(event) {
    processNodeClick(this.__data__, this);
    // d3.select("#graphLabel").text(this.textContent);
}

// returns if the element or one of its ancestors matches the selector, return the matching
// element or ancestor else null.
// https://stackoverflow.com/questions/16863917/check-if-class-exists-somewhere-in-parent
function elementOrParentMatchesSelector(element, selector) {
    // This is a race condition with removing redundant edges I think?
    if (element === null) return null;
    // Probably at the level of the HTML object at this point.
    if (typeof element.matches !== 'function') return null;
    if (element.matches(selector)) return element;
    // No parent
    if (element.parentNode === undefined) return null;
    return elementOrParentMatchesSelector(element.parentNode, selector);
}

function newGraph() {
    return new dagreD3.graphlib.Graph()
        .setGraph({ rankdir: "LR" })
        .setDefaultEdgeLabel(function () { return {}; });
}

function handleZoom(e) {
    d3.select('svg g')
        .attr('transform', e.transform);
}

function initZoom() {
    d3.select('svg')
        .call(zoom);
}

function initGraph() {
    // Check for graph parameters in the URL
    let graphRE = /[?&]graph=([^&]+)/;
    let graphMatch = window.location.search.match(graphRE);
    if (graphMatch) {
        let stringJsonGraph = decodeURIComponent(graphMatch[1]);
        g = graphFromJson(stringJsonGraph);
    } else if (localStorage.getItem("graph")) {
        g = graphFromLocalStorage();
    } else {
        // Create the input graph
        g = newGraph();
        // setupGraph();
        // localStorage.clear();
    }
    reduceStoreRenderGraph();
    initZoom();
}

/* Globals */
let sourceNodeEl = undefined;
let g = undefined;

const addNodeTextBoxEl = document.getElementById('addNodeTextBox');
const editNodeTextBoxEl = document.getElementById('editNodeTextBox');
const sourceNodeTextEl = document.getElementById('sourceNodeText');
const listEl = document.getElementById('list');
const graphLink = d3.select("#graphLink");

const loadFileBtn = document.getElementById('loadFileBtn');
const saveFileBtn = document.getElementById('saveFileBtn');

// Create the renderer
const render = new dagreD3.render();

// Set up an SVG group so that we can translate the final graph.
const svg = d3.select("svg");
const svgGroup = d3.select("svg g");


/* Event listeners */
const zoom = d3.zoom()
    .on('zoom', handleZoom);

/* After a click anywhere on screen, if the click is inside the svg but not on a node,
then clear the source node. */
https://stackoverflow.com/questions/36695438/detect-click-outside-div-using-javascript
window.addEventListener('click', function (e) {
    let node_or_null = elementOrParentMatchesSelector(e.target, 'g.node');
    // TODO Could do this more efficiently by doing this in the above step.
    let svg_or_null = elementOrParentMatchesSelector(e.target, '#svg-canvas');

    if (node_or_null === null && svg_or_null !== null) {
        // Clicked inside box, but not on a node so clear source node.
        clearSourceNode();
        updateList();
        // Could set the graph label if we want.
        // d3.select("#graphLabel").text("");
    }
});

window.addEventListener('keyup', function (e) {
    const key = e.key;
    if (key === "Delete") {
        if (sourceNodeEl !== undefined) {
            g.removeNode(sourceNodeEl.__data__);
            reduceStoreRenderGraph();
            clearSourceNode();
            updateList();
        }
    }
});

addNodeTextBoxEl.addEventListener('keyup', function (e) {
    if (e.key === "Enter") {
        addNodeBtnFn();
    }
});

editNodeTextBoxEl.addEventListener('keyup', function (e) {
    if (e.key === "Enter") {
        editNodeBtnFn();
    }
});

/* Main */

initGraph();
updateList();