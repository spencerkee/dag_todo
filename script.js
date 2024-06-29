function addNodeBtnFn() {
    if (!addNodeTextBoxEl.value) return;
    addNode(g, addNodeTextBoxEl.value);
    addNodeTextBoxEl.value = "";
    renderGraph();
}

function editNodeBtnFn() {
    if (!editNodeTextBoxEl.value) return;
    editNode(g, sourceNodeTextEl.innerText, editNodeTextBoxEl.value);
    editNodeTextBoxEl.value = "";
    renderGraph();
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

// TODO Don't like how this edits g but addNode edits the input graph.
function editNode(graph, oldNodeName, newNodeName) {
    // TODO Figure out how to set edges.
    if (oldNodeName === newNodeName) return;
    // I basically need to recreate the graph unless I want the labels to be different
    // than the ids.

    const graphPostEdit = newGraph();
    for (const node of graph.nodes()) {
        if (node !== oldNodeName) {
            addNode(graphPostEdit, node);
        } else {
            addNode(graphPostEdit, newNodeName);
        }
    }

    for (const edge of graph.edges()) {
        newEdge = structuredClone(edge);
        if (newEdge.v === oldNodeName) { newEdge.v = newNodeName }
        if (newEdge.w === oldNodeName) { newEdge.w = newNodeName }
        graphPostEdit.setEdge(newEdge.v, newEdge.w);
    }

    g = graphPostEdit;
    graphToLocalStorage();
    renderGraph();

    // Get html element of new source node. TODO There's undoubtedly a better way of doing this.
    let newSourceNode = d3.selectAll("g.node").nodes().find(n => n.__data__ === newNodeName);
    setSourceNode(newSourceNode);
}

// Note this also clears the edit text box. I'll see if that's an issue later.
function clearSourceNode() {
    sourceNodeTextEl.innerText = "";
    sourceNodeEl = undefined;
    editNodeTextBoxEl.value = "";
}

function setSourceNode(htmlNode) {
    sourceNodeTextEl.innerText = htmlNode.textContent;
    sourceNodeEl = htmlNode;
    editNodeTextBoxEl.value = htmlNode.textContent;
}

function nodeClickListener(event) {
    // First click with no source node set.
    if (sourceNodeEl === undefined) {
        setSourceNode(this);
        return;
    }
    // Self click
    if (sourceNodeEl.__data__ === this.__data__) {
        return clearSourceNode();
    }
    // Add edge
    g.setEdge(sourceNodeEl.__data__, this.__data__);
    clearSourceNode();
    reduceStoreRenderGraph();
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
        setupGraph();
    }
    reduceStoreRenderGraph();
    initZoom();
}



/* Globals */
let sourceNodeEl = undefined;
let g = undefined;

const addNodeTextBoxEl = document.getElementById('addNodeTextBox');
const editNodeTextBoxEl = document.getElementById('editNodeTextBox');
const sourceNodeTextEl = document.getElementById('sourceNodeTextEl');
const graphLink = d3.select("#graphLink");

const loadResultsBtn = document.getElementById('loadResultsBtn');
const saveResultsBtn = document.getElementById('saveResultsBtn');

// Create the renderer
var render = new dagreD3.render();

// Set up an SVG group so that we can translate the final graph.
var svg = d3.select("svg");
var svgGroup = d3.select("svg g");


/* Event listeners */
let zoom = d3.zoom()
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