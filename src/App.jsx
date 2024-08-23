import { createUndoHistory } from "@solid-primitives/history";
import * as d3 from "d3";
import dagreD3 from "dagre-d3/dist/dagre-d3";
import { batch, createEffect, createMemo, createSignal, onMount, untrack } from "solid-js";
import * as dg from "./dg.js";
import "./index.css";
import TodoList from "./todoList.jsx";

function mapToJson(map) {
    const obj = {}
    for (let [k, v] of map)
        obj[k] = v
    return JSON.stringify(obj)
}

function objectToJson(object) {
    function replacer(key, value) {
        if (value instanceof Map) {
            return {
                dataType: 'Map',
                value: Array.from(value.entries()), // or with spread: value: [...value]
            };
        } else if (value instanceof Set) {
            return {
                dataType: 'Set',
                value: Array.from(value),
            };
        }
        return value;
    }
    return JSON.stringify(object, replacer);
}

function graphToJson(graph) {
    return objectToJson(graph);
}

function jsonToObject(json) {
    function reviver(key, value) {
        if (typeof value === 'object' && value !== null) {
            if (value.dataType === 'Map') {
                return new Map(value.value);
            } else if (value.dataType === 'Set') {
                return new Set(value.value);
            }
        }
        return value;
    }
    return JSON.parse(json, reviver);
}

function jsonToGraph(json) {
    return jsonToObject(json);
}

function saveFile(state) {
    // Needed to stringify maps. Source: https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
    let json = graphToJson(D);
    let a = document.createElement("a")
    a.href = URL.createObjectURL(
        new Blob([json], { type: "application/json" })
    )
    let now = new Date();
    a.download = `${graphName()}_${now.toISOString().split('.')[0]}.md`;
    // Incorporating the timestamp might still be nice.
    // a.download = `todoGraph-${now.toISOString().split('.')[0]}.json`
    a.click();
    // TODO How do we tell if the download was successful or not? We may not want to set the numEditsOnLastLoad in that case.
    setNumDataEditsOnLastLoad(numDataEdits());
}

function openFile() {
    document.getElementById('inputFile').click();
}

function updateGraphAFromGraphB(dataGraph, jsonGraph) {
    dataGraph.nodes = jsonGraph.nodes;
    dataGraph.edges = jsonGraph.edges;
    dataGraph.graph = jsonGraph.graph;
}

function cloneGraphAToGraphB(dataGraph, jsonGraph) {
    dataGraph.nodes = structuredClone(jsonGraph.nodes);
    dataGraph.edges = structuredClone(jsonGraph.edges);
    dataGraph.graph = structuredClone(jsonGraph.graph);
}

function loadFile(fileBlob) {
    if (fileBlob === undefined) return;
    let reader = new FileReader();
    reader.readAsText(fileBlob);

    reader.onload = function () {
        const jsonGraph = jsonToGraph(reader.result);
        updateGraphAFromGraphB(D, jsonGraph);
        batch(() => {
            setSourceNode(undefined);
            console.debug(`loadFile setting numDataEdits=${numDataEdits() + 1}`);
            setNumDataEdits(numDataEdits() + 1);
            setNumDataEditsOnLastLoad(numDataEdits());
            clearHistory();
        });
    }

    reader.onerror = function () {
        console.log(reader.error);
    };
}

function fetchViewGraph(dataGraph, viewGraph, showCompleted) {
    cloneGraphAToGraphB(viewGraph, dataGraph);
    if (!showCompleted) {
        for (let [nodeId, nodeAttrs] of viewGraph.nodes) {
            if (nodeAttrs.completed) {
                dg.removeNode(viewGraph, nodeId);
            }
        }
        dg.performTransitiveReduction(viewGraph);
    }
}

function newGraph() {
    return new dagreD3.graphlib.Graph()
        .setGraph({ rankdir: "LR" })
        .setDefaultEdgeLabel(function () { return {}; });
}

function fetchLongestPath(G) {
    let lengthTo = new Map();
    let currentMax = 0;
    let currentMaxNode = undefined;
    for (const [nodeId, _] of G.nodes) {
        lengthTo.set(nodeId, {
            len: 0,
            pred: undefined,
        });
    }
    let topOrder = dg.topologicalSort(G);
    for (const v of topOrder) {
        for (const w of G.graph.get(v)) {
            if (lengthTo.get(w).len <= lengthTo.get(v).len + 1) {
                lengthTo.set(w, {
                    len: lengthTo.get(v).len + 1,
                    pred: v,
                });
                if (lengthTo.get(w).len > currentMax) {
                    currentMax = lengthTo.get(w).len;
                    currentMaxNode = w;
                }
            }
        }
    }
    let path = [];
    let current = currentMaxNode;
    while (current !== undefined) {
        path.push(current);
        current = lengthTo.get(current).pred;
    }
    return path.reverse();
}

function convertDataGraphToDagre(dataGraph) {
    let g = newGraph();

    // Clone attrs here because otherwise when we render the renderGraph it will add attributes to the dataGraph.
    for (const [id, nodeAttrs] of dataGraph.nodes.entries()) {
        const d3NodeAttrs = {
            label: nodeAttrs.label,
            // Round the corners of the nodes
            rx: 5,
            ry: 5,
        };
        if (nodeAttrs.completed) {
            d3NodeAttrs.class = "completed";
        }
        g.setNode(id, d3NodeAttrs);
    }
    for (const [edge, edgeAttrs] of dataGraph.edges.entries()) {
        let [source, target] = edge.split(',');
        const edgeAttrsClone = structuredClone(edgeAttrs);
        g.setEdge(source, target, edgeAttrsClone);
    }

    return g;
}

function updateGraphFromLocalStorage(G) {
    let json = localStorage.getItem('dataGraph');
    let jsonGraph = jsonToGraph(json);
    // TODO Is it even necessary to serialize it to json?
    if (jsonGraph !== null) {
        console.log('Loading jsonGraph from localStorage');
        // TODO Save this name in appState
        setGraphName("");
        updateGraphAFromGraphB(G, jsonGraph);
    } else {
        console.log('jsonGraph in localStorage is null');
    }
}

function handleZoom(e) {
    d3.select('svg g')
        .attr('transform', e.transform);
}

function initZoom(zoom) {
    d3.select('svg')
        .call(zoom);
}

function resetZoom(svgCanvas, svgGroup, zoom) {
    const { width, height } = d3.select(svgGroup).node().getBBox();
    if (width && height) {
        const scale = Math.min(svgCanvas.clientWidth / width, svgCanvas.clientHeight / height) * 0.95
        zoom.scaleTo(d3.select(svgCanvas), scale)
        zoom.translateTo(d3.select(svgCanvas), width / 2, height / 2)
    }
}

function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        console.log('Fallback: Copying text command was ' + msg);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
}

function copyTextToClipboard(text) {
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }
    navigator.clipboard.writeText(text).then(function () {
        console.log('Async: Copying to clipboard was successful!');
    }, function (err) {
        console.error('Async: Could not copy text: ', err);
    });
}

function copyGraphToClipboard(dataGraph) {
    let json = graphToJson(dataGraph);
    copyTextToClipboard(json);
}

/* Start of non-graph functions */
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

function genericClickListener(e) {
    console.log('click in window');
    let node_or_null = elementOrParentMatchesSelector(e.target, 'g.node');
    // TODO Could do this more efficiently by doing this in the above step.
    let svg_or_null = elementOrParentMatchesSelector(e.target, '#svg-canvas');

    if (node_or_null === null && svg_or_null !== null && sourceNode() !== undefined) {
        // Clicked inside box, but not on a node so clear source node.
        // clearSourceNode();
        console.log('window clearing source node');
        setSourceNode(undefined);
        // updateList();

        // Could set the graph label if we want.
        // d3.select("#graphLabel").text("");
    }
}

function processNodeClick(nodeId) {
    // First click with no source node set.
    if (sourceNode() === undefined) {
        setSourceNode(nodeId);
        // updateList(); // This is done in the next step.
        return;
    }

    // Clear on self click
    if (sourceNode() === nodeId) {
        setSourceNode(undefined);
        return;
    }

    // Add edge
    console.log(`Adding edge from '${sourceNode()}' to '${nodeId}'`);
    dg.addEdgeAndReduce(D, sourceNode(), nodeId);
    // Don't do the below in case you want to set multiple children
    // setSourceNode(undefined);
}

function nodeClickListener(event) {
    let nodeId = event.target.__data__;
    processNodeClick(nodeId, sourceNode, setSourceNode);
}

function getSourcesList(G, sourceNode, numViewEdits) {
    // Technically this line is not necessary since this was called with getSourcesList(V, numViewEdits()) but leaving it in for future reference.
    let _ = numViewEdits;
    let sources = dg.sources(G);
    if (sourceNode !== undefined) {
        sources = sources.filter(n => n !== sourceNode && !dg.isPathBetween(G, n, sourceNode));
    }
    return sources;
}

function getSpineList(G, sourceNode, numViewEdits) {
    let _ = numViewEdits;
    let spine = fetchLongestPath(G);
    return spine.filter(n => n !== sourceNode);
}

function getUnconnectedNodesList(G, sourceNode, numViewEdits) {
    let _ = numViewEdits;
    let unconnectedNodes = dg.getUnconnectedNodes(G, sourceNode);
    let orderedUnconnectedNodes = dg.topologicalSort(G).filter(n => unconnectedNodes.has(n));
    return orderedUnconnectedNodes;
}

// https://www.d3indepth.com/zoom-and-pan/
const zoom = d3.zoom()
    // TODO constrain zoom and pan.
    // .scaleExtent([1, 5])
    // .translateExtent([[0, 0], [width, height]])
    .on('zoom', handleZoom);

/* Global signals. TODO should probably use context in the future. */
const [numDataEdits, setNumDataEdits] = createSignal(0);
const [numViewEdits, setNumViewEdits] = createSignal(0);
const [newTitle, setTitle] = createSignal("");
// TODO This probably doesn't need to be a signal.
const [graphName, setGraphName] = createSignal("myGraph.json");
const [sourceNode, setSourceNode] = createSignal(undefined);
const [todos, setTodos] = createSignal([]);
const [numDataEditsOnLastLoad, setNumDataEditsOnLastLoad] = createSignal(0);
const [showCompleted, setShowCompleted] = createSignal(false);
const [trackClearHistory, clearHistory] = createSignal(undefined, { equals: false });
const [newChild, setNewChild] = createSignal("");
const [newParent, setNewParent] = createSignal("");
const D = {
    nodes: new Map(),
    edges: new Map(),
    graph: new Map(),
    numDataEdits: numDataEdits,
    setNumDataEdits: setNumDataEdits,
}
// TODO Do I need to trigger a render here?
updateGraphFromLocalStorage(D);
const V = {
    nodes: new Map(),
    edges: new Map(),
    graph: new Map(),
}

const App = () => {
    console.log('App');

    // console.log('init');
    // batch(() => {
    //     let aId = dg.addNode(D, "a");
    //     let bId = dg.addNode(D, "b");
    //     let cId = dg.addNode(D, "c");
    //     let dId = dg.addNode(D, "d");
    //     console.log(`D.nodes=${mapToJson(D.nodes)}`);

    //     dg.addEdge(D, aId, bId, {
    //         style: "stroke: #f66; stroke-width: 3px; stroke-dasharray: 5, 5;",
    //         arrowheadStyle: "fill: #f66"
    //     });
    //     dg.addEdge(D, bId, cId, {
    //         label: "B to C",
    //         labelStyle: "font-style: italic; text-decoration: underline;"
    //     });
    //     dg.addEdge(D, aId, cId, {
    //         label: "line interpolation different",
    //         // curve: d3.curveBasis
    //     });
    //     console.log(`D.edges=${mapToJson(D.edges)}`);
    //     // dg.removeNode(D, aId);
    //     console.log(`D.nodes=${mapToJson(D.nodes)}`);
    //     // console.log(dataGraph.getNodeIdByLabel('b'));
    // });
    let svgGroup2 = d3.select("svg g");
    // Create the renderer
    const renderer = new dagreD3.render();

    // TODO This should be based on viewGraph
    let renderGraph = convertDataGraphToDagre(D);

    // Set up an SVG group so that we can translate the final graph.
    let svgCanvas;
    let svgGroup;

    /* Reactive functions? */
    const addTodo = (e) => {
        e.preventDefault();
        batch(() => {
            dg.addNode(D, newTitle());
            setTitle("");
        });
    };
    const addNewChild = (e) => {
        e.preventDefault();
        batch(() => {
            let newNodeId = dg.addNode(D, newChild());
            dg.addEdge(D, sourceNode(), newNodeId);
            setNewChild("");
        });
    };
    const addNewParent = (e) => {
        e.preventDefault();
        batch(() => {
            let newNodeId = dg.addNode(D, newParent());
            dg.addEdge(D, newNodeId, sourceNode());
            setNewParent("");
        });
    }

    const history = createMemo(() => {
        // Track what should rerun the memo
        console.debug('Clearing undo history');
        trackClearHistory();
        return createUndoHistory(() => {
            // track the changes to the state (and clone if you need to)
            // TODO I don't know if I need to track numViewEdits or numDataEdits here.
            const v = numViewEdits();
            console.debug(`Saving jsonGraph to history numViewEdits=${numViewEdits()}`);
            // TODO Don't think I need to convert to json, possibly just slows things down.
            const json = graphToJson(D);
            console.debug(`saving nodes=${Array.from(D.nodes.keys())} edges=${Array.from(D.edges.keys())}`);

            // return a callback to set the state back to the tracked value
            return () => {
                console.debug(`Loading jsonGraph from history numDataEdits = ${numDataEdits()} v = ${v}`);
                const jsonGraph = jsonToGraph(json);
                console.debug(`loading nodes = ${Array.from(jsonGraph.nodes.keys())} edges = ${Array.from(jsonGraph.edges.keys())}`);
                // TODO Save this name in appState
                updateGraphAFromGraphB(D, jsonGraph);
                untrack(() => {
                    setNumDataEdits(numDataEdits() + 1);
                    // TODO?
                    // setNumDataEditsOnLastLoad(numDataEdits());
                });
            };
        });
    });

    /* Event listeners */
    /* After a click anywhere on screen, if the click is inside the svg but not on a node,
then clear the source node. */
    https://stackoverflow.com/questions/36695438/detect-click-outside-div-using-javascript
    window.addEventListener('click', genericClickListener);
    // Ctrl + S to save
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 's') {
            // Prevent the Save dialog to open
            e.preventDefault();
            saveFile(D);
        }
    });
    // Ctrl + Z to undo
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'z') {
            history().undo();
        }
    });
    // Ctrl + Y to redo
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'y') {
            history().redo();
        }
    });

    /* Effects */
    // Construct view graph from data graph
    createEffect(() => {
        let _ = numDataEdits();
        let shouldShowCompleted = showCompleted();
        console.debug(`Construct view numDataEdits = ${numDataEdits()}`);
        // TODO Race condition with source node? Or removed now that I have the graph produce the signal?
        untrack(() => {
            // performTransitiveReduction(D);
            fetchViewGraph(D, V, shouldShowCompleted);
            console.debug(`d to v conversion setting numViewEdits = ${numViewEdits() + 1}`);
            setNumViewEdits(numViewEdits() + 1);
        });
    });

    // Main render loop
    createEffect(() => {
        console.log('render loop')
        let _ = numViewEdits();
        console.debug(`Render view numViewEdits = ${numViewEdits()}`);
        renderGraph = convertDataGraphToDagre(V);
        renderer(d3.select(svgGroup), renderGraph);
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
    });

    // Save graph to local storage on edit.
    createEffect(() => {
        let _ = numDataEdits();
        const jsonGraph = graphToJson(D);
        localStorage.setItem('dataGraph', jsonGraph);
    });

    onMount(() => {
        console.log('mount');
        clearHistory();
        /* Event Listeners */
        // Listen for the delete key to remove nodes.
        window.addEventListener('keyup', function (e) {
            const key = e.key;
            if (key === "Delete") {
                if (sourceNode() !== undefined) {
                    batch(() => {
                        dg.removeNodeAndContract(D, sourceNode());
                        setSourceNode(undefined);
                    });
                }
            }
        });

        initZoom(zoom);
        resetZoom(svgCanvas, svgGroup, zoom);
        // TODO Set up this zoomIdentity stuff.
        // d3.select('svg g').transition().duration(750).call(zoom.transform, d3.zoomIdentity);
    });

    return (
        <>
            <h3>TODO Dag</h3>
            <button onClick={() => saveFile(D)}>Save File</button>
            <input type="file" name="" id='inputFile' onChange={(e) => {
                // TODO Not sure about this option chaining.
                let fileObj = e?.target?.files[0];
                // Works even if there's no extension.
                let filenameWithoutExtension = fileObj.name.replace(/\.[^/.]+$/, "");
                setGraphName(filenameWithoutExtension);
                loadFile(fileObj);
                resetZoom(svgCanvas, svgGroup, zoom);
            }} hidden></input >
            <button onClick={() => openFile()}>Load File</button>
            <input
                type="text"
                value={graphName()}
                onChange={(e) => setGraphName(e.currentTarget.value)}
            />
            <button onClick={() => copyGraphToClipboard(D)}>Copy to Clipboard</button>
            <Show when={numDataEdits() > numDataEditsOnLastLoad()}>(unsaved)</Show>
            <form onSubmit={addTodo}>
                <input
                    placeholder="enter todo and click +"
                    required
                    value={newTitle()}
                    onInput={(e) => setTitle(e.currentTarget.value)}
                />
                <button>+</button>
            </form>
            <button disabled={!history().canUndo()} onClick={history().undo}>
                Undo
            </button>
            <button disabled={!history().canRedo()} onClick={history().redo}>
                Redo
            </button>
            Show Completed
            <input
                type="checkbox"
                checked={showCompleted()}
                onChange={(e) => {
                    console.log(`showCompleted = ${showCompleted()} changing to ${e.target.checked}`);
                    setShowCompleted(e.target.checked);
                }
                }
            />
            <svg id="svg-canvas" ref={svgCanvas}>
                <g id="svg-g" ref={svgGroup}></g>
            </svg>
            <Show when={sourceNode() !== undefined}>
                <div class="flexBox" >
                    {"Source Node: "}
                    <input
                        type="checkbox"
                        checked={D.nodes.get(sourceNode()).completed || false}
                        onChange={(e) => {
                            dg.setNode(D, sourceNode(), {
                                ...D.nodes.get(sourceNode()),
                                completed: e.target.checked
                            });
                            if (!showCompleted() && e.target.checked) {
                                setSourceNode(undefined);
                            }
                        }
                        }
                    />
                    <input
                        type="text"
                        value={D.nodes.get(sourceNode()).label}
                        // style={
                        //     { width: "40vw" }
                        // }
                        onChange={(e) => dg.setNodeLabel(D, sourceNode(), e.currentTarget.value)}
                    />
                    {"Parent: "}
                    <form onSubmit={addNewParent}>
                        <input
                            placeholder="enter parent and click +"
                            required
                            value={newParent()}
                            onInput={(e) => setNewParent(e.currentTarget.value)}
                        />
                        <button>+</button>
                    </form>
                    {"Child: "}
                    <form onSubmit={addNewChild}>
                        <input
                            placeholder="enter child and click +"
                            required
                            value={newChild()}
                            onInput={(e) => setNewChild(e.currentTarget.value)}
                        />
                        <button>+</button>
                    </form>
                </div>
            </Show>
            <div class="flexBox">
                {/*
                https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Basic_concepts_of_flexbox#shorthand_values_for_the_flex_properties
                https://github.com/solidjs/solid/discussions/749
                https://stackoverflow.com/questions/73890749/how-do-i-pass-a-signal-setter-as-a-prop-to-a-child-component
                TODO: Group up these related objects to reduce some lines.
                */}
                <TodoList
                    // Signals
                    sourceNode={sourceNode()}
                    setSourceNode={setSourceNode}
                    numViewEdits={numViewEdits()}
                    // Non-signals
                    todoItems={getSourcesList(V, sourceNode(), numViewEdits())}
                    D={D}
                    title="Sources"
                />
                <TodoList
                    // Signals
                    sourceNode={sourceNode()}
                    setSourceNode={setSourceNode}
                    numViewEdits={numViewEdits()}
                    // Non-signals
                    todoItems={getSpineList(V, sourceNode(), numViewEdits())}
                    D={D}
                    title="Spine"
                />
                <Show when={sourceNode() !== undefined}>
                    <TodoList
                        // Signals
                        sourceNode={sourceNode()}
                        setSourceNode={setSourceNode}
                        numViewEdits={numViewEdits()}
                        // Non-signals
                        todoItems={getUnconnectedNodesList(V, sourceNode(), numViewEdits())}
                        D={D}
                        title="Unconnected"
                    />
                </Show>
            </div>
        </>
    );
};

export default App;