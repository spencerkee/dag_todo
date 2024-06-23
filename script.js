function graphToJson() {
    let jsonGraph = dagreD3.graphlib.json.write(g);
    return JSON.stringify(jsonGraph)
}

function graphFromJson(json) {
    let jsonGraph = JSON.parse(json);
    return dagreD3.graphlib.json.read(jsonGraph);
}

function graphToLocalStorage() {
    let jsonGraph = graphToJson();
    localStorage.setItem("graph", JSON.stringify(jsonGraph));
}

function graphFromLocalStorage() {
    const stringJsonGraph = localStorage.getItem("graph");
    const jsonGraph = JSON.parse(stringJsonGraph);
    return graphFromJson(jsonGraph);
}

function graphToURL() {
    var elems = [window.location.protocol, '//',
    window.location.host,
    window.location.pathname,
        '?'];

    var queryParams = [];

    stringJsonGraph = graphToJson();
    queryParams.push('graph=' + encodeURIComponent(stringJsonGraph));
    elems.push(queryParams.join('&'));

    return elems.join('');
}

function addNodeBtnFn() {
    if (!textBoxEl.value) return;
    addNode(g, textBoxEl.value);
    textBoxEl.value = "";
    renderGraph();
}

// TODO Move event listener logic here.
function addNode(graph, name) {
    graph.setNode(name, {
        label: name,
        // Round the corners of the nodes
        rx: 5,
        ry: 5,
    });
}

function setupGraph() {
    // Here we're setting nodeclass, which is used by our custom drawNodes function
    // below.
    g.setNode(0, { label: "TOP", class: "type-TOP" });
    g.setNode(1, { label: "S", class: "type-S" });
    g.setNode(2, { label: "NP", class: "type-NP" });
    g.setNode(3, { label: "DT", class: "type-DT" });
    g.setNode(4, { label: "This", class: "type-TK" });
    g.setNode(5, { label: "VP", class: "type-VP" });
    g.setNode(6, { label: "VBZ", class: "type-VBZ" });
    g.setNode(7, { label: "is", class: "type-TK" });
    g.setNode(8, { label: "NP", class: "type-NP" });
    g.setNode(9, { label: "DT", class: "type-DT" });
    g.setNode(10, { label: "an", class: "type-TK" });
    g.setNode(11, { label: "NN", class: "type-NN" });
    g.setNode(12, { label: "example", class: "type-TK" });
    g.setNode(13, { label: ".", class: "type-." });
    g.setNode(14, { label: "sentence", class: "type-TK" });

    // Set up edges, no special attributes.
    g.setEdge(3, 4);
    g.setEdge(2, 3);
    g.setEdge(1, 2);
    g.setEdge(6, 7);
    g.setEdge(5, 6);
    g.setEdge(9, 10);
    g.setEdge(8, 9);
    g.setEdge(11, 12);
    g.setEdge(8, 11);
    g.setEdge(5, 8);
    g.setEdge(1, 5);
    g.setEdge(13, 14);
    g.setEdge(1, 13);
    g.setEdge(0, 1);
}

function clearSourceNode() {
    sourceNodeTextEl.innerText = "";
    sourceNodeEl = undefined;
}

function nodeClickListener(event) {
    // First click with no source node set.
    if (sourceNodeEl === undefined) {
        sourceNodeTextEl.innerText = this.textContent;
        sourceNodeEl = this;
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

function renderGraph() {
    // var padding = 20,
    //   bBox = svgGroup.node().getBBox(),
    //   height = svg.attr('height'),
    //   width = svg.attr('width'),
    //   hRatio = height / (bBox.height + padding),
    //   wRatio = width / (bBox.width + padding);

    // zoom.translateTo([(width - bBox.width * initialScale) / 2, padding / 2])
    //   .scale(hRatio < wRatio ? hRatio : wRatio)
    //   .event(svg);

    g.nodes().forEach(function (v) {
        var node = g.node(v);
        // Round the corners of the nodes
        node.rx = node.ry = 5;
    });

    // Run the renderer. This is what draws the final graph.
    render(d3.select("svg g"), g);

    // // Center the graph
    // var xCenterOffset = (svg.attr("width") - g.graph().width) / 2;
    // svgGroup.attr("transform", "translate(" + xCenterOffset + ", 20)");
    // svg.attr("height", g.graph().height + 40);

    // Save link to new graph
    graphLink.attr("href", graphToURL());

    // Add event listeners
    /*
    TODO Check out
    https://d3js.org/d3-selection/selecting#selectAll
    https://d3js.org/d3-selection/events#selection_on
    https://developer.mozilla.org/en-US/docs/Web/API/Event
    // When creating the listener we can use either this or nodes[i] to refer to the node that triggered the event.
    I like this website and its format
    https://using-d3js.com/08_01_events.html
    https://using-d3js.com/08_01_events.html#h_42s6Es9avm this has a way of setting graph text,
    probably better for source node.
    */
    d3.selectAll('svg g.node')
        .on('click', nodeClickListener);
}

function reduceStoreRenderGraph() {
    // https://brunoscheufler.com/blog/2021-12-05-decreasing-graph-complexity-with-transitive-reductions
    function getChildren(graph, node) {
        return graph.neighbors(node).filter(n => graph.hasEdge(node, n));
    }

    function getDescendents(graph, node) {
        function dfs(graph, start) {
            const stack = [start];
            const visited = new Set();
            const result = [];

            while (stack.length) {
                const vertex = stack.pop();

                if (!visited.has(vertex)) {
                    visited.add(vertex);
                    result.push(vertex);

                    for (const child of getChildren(graph, vertex)) {
                        stack.push(child);
                    }
                }
            }

            return result;
        }

        let descendants = dfs(graph, node);
        // Remove self
        descendants = descendants.slice(1);
        return descendants;
    }

    function countIncomingEdges(graph, node) {
        return graph.edges().filter(edge => edge.w === node).length;
    }

    /**
     * Equivalent to indegree(G) of networkx
     * @returns
     */
    function countIncomingEdgesForNodes(graph) {
        const nodeIncomingEdges = new Map();

        for (const n of graph.nodes()) {
            nodeIncomingEdges.set(n, countIncomingEdges(graph, n));
        }

        return nodeIncomingEdges;
    }

    function performTransitiveReduction(graph) {
        // Topologically sort the graph
        // const sortedVertices = topologicalSort(graph);

        // Initialize the transitive reduction graph
        const transitiveReduction = newGraph();

        // Iterate over the sorted vertices in reverse order
        for (const vertex of graph.nodes()) {
            // Add the vertex to its own transitive closure (ignore this)
            addNode(transitiveReduction, vertex);
        }

        let descendants = new Map();
        let checkCount = countIncomingEdgesForNodes(graph);

        // Go over all nodes in the graph
        for (const u of graph.nodes()) {
            // Find neighbouring nodes of u
            const finalChildren = new Set(getChildren(graph, u));

            // Go over all neighbouring nodes (retrieve it once more since we'll modify uNeighbours)
            for (const v of getChildren(graph, u)) {
                if (finalChildren.has(v)) {
                    if (!descendants.has(v)) {
                        // Find descendants of v with depth-first search
                        const walkedEdges = new Set(getDescendents(graph, v));
                        descendants.set(v, walkedEdges);
                    }
                    // Delete all descendants of v from uNeighbours
                    for (const d of descendants.get(v) || []) {
                        finalChildren.delete(d);
                    }
                }

                checkCount.set(v, checkCount[v] - 1);
                if (checkCount.get(v) === 0) {
                    descendants.delete(v);
                }
            }
            // Add edges to our transitive reduction again
            for (const v of finalChildren) {
                transitiveReduction.setEdge(u, v);
            }
        }

        return transitiveReduction;
    }

    function topologicalSort(graph) {
        const visited = {};
        const stack = [];

        for (const node of graph.nodes()) {
            if (!visited[node]) {
                topologicalSortHelper(graph, node, visited, stack);
            }
        }

        return stack.reverse();
    }

    // function getNeighbors(graph, node) {
    //   return neighbors = graph.edges().filter(edge => edge.w == node).map(e => e.v);
    // }

    function topologicalSortHelper(graph, node, visited, stack) {
        visited[node] = true;

        for (const neighbor of graph.neighbors(node)) {
            if (!visited[neighbor]) {
                topologicalSortHelper(neighbor, visited, stack);
            }
        }

        stack.push(node);
    }
    g = performTransitiveReduction(g);
    graphToLocalStorage();
    renderGraph();
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

const textBoxEl = document.getElementById('addNodeTextBox');
const sourceNodeTextEl = document.getElementById('sourceNodeTextEl');
const graphLink = d3.select("#graphLink");

const loadResultsBtn = document.getElementById('loadResultsBtn');
const saveResultsBtn = document.getElementById('saveResultsBtn');

// Create the renderer
var render = new dagreD3.render();

// Set up an SVG group so that we can translate the final graph.
var svg = d3.select("svg");
var svgGroup = d3.select("svg g");

let zoom = d3.zoom()
    .on('zoom', handleZoom);

/* Event listeners */
// loadResultsBtn.addEventListener('change', async () => { loadResults(); });
// saveResultsBtn.addEventListener('change', async () => { saveResults(); });

// On a click anywhere on the screen, check if that element or one of it's ancestors
// is a node. Probably a better way of doing this is restricting it to just that box.
https://stackoverflow.com/questions/36695438/detect-click-outside-div-using-javascript
window.addEventListener('click', function (e) {
    let element_or_null = elementOrParentMatchesSelector(e.target, 'g.node');

    if (element_or_null === null) {
        // Clicked outside the box, clear source node.
        sourceNodeTextEl.innerText = "";
        sourceNodeEl = undefined;
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

textBoxEl.addEventListener('keyup', function (e) {
    if (e.key === "Enter") {
        addNodeBtnFn();
    }
});

/* Main */

initGraph();