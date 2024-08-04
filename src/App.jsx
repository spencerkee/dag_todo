import * as d3 from "d3";
import dagreD3 from "dagre-d3/dist/dagre-d3";
import { batch, createEffect, createSignal, onMount } from "solid-js";
import DataGraph from "./data-graph";
import "./index.css";

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

function graphToJson(dataGraph) {
  return objectToJson(dataGraph);
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
  let json = graphToJson(dataGraph);
  let a = document.createElement("a")
  a.href = URL.createObjectURL(
    new Blob([json], { type: "application/json" })
  )
  let now = new Date();
  a.download = graphName();
  // Incorporating the timestamp might still be nice.
  // a.download = `todoGraph-${now.toISOString().split('.')[0]}.json`
  a.click()
}

function openFile() {
  document.getElementById('inputFile').click();
}

function updateDataGraphFromJsonGraph(dataGraph, jsonGraph) {
  dataGraph.nodes = jsonGraph.nodes;
  dataGraph.edges = jsonGraph.edges;
  dataGraph.graph = jsonGraph.graph;
}

function loadFile(fileBlob) {
  if (fileBlob === undefined) return;
  let reader = new FileReader();
  reader.readAsText(fileBlob);

  reader.onload = function () {
    const jsonGraph = jsonToGraph(reader.result);
    updateDataGraphFromJsonGraph(dataGraph, jsonGraph);
    batch(() => {
      setSourceNode(undefined);
      setNumEdits(numEdits() + 1);
    });
  }

  reader.onerror = function () {
    console.log(reader.error);
  };
}

function newGraph() {
  return new dagreD3.graphlib.Graph()
    .setGraph({ rankdir: "LR" })
    .setDefaultEdgeLabel(function () { return {}; });
}

/* Start graph functions */
function dfs(graph, start, neighborFunc) {
  const stack = [start];
  const visited = new Set();
  const result = [];

  while (stack.length) {
    const vertex = stack.pop();

    if (!visited.has(vertex)) {
      visited.add(vertex);
      result.push(vertex);

      for (const child of graph[neighborFunc](vertex)) {
        stack.push(child);
      }
    }
  }

  return result;
}

function getUnconnectedNodes(graph, node) {
  let allNodes = new Set(graph.nodes);
  let connectedNodes = new Set([node]);
  getDescendents(graph, node).forEach(connectedNodes.add, connectedNodes);
  getAncestors(graph, node).forEach(connectedNodes.add, connectedNodes);
  let unconnectedNodes = allNodes.difference(connectedNodes);
  let orderedUnconnectedNodes = topologicalSort(g).filter(n => unconnectedNodes.has(n));
  return orderedUnconnectedNodes;
}

function performTransitiveReduction(dataGraph) {
  /*
  For each node x in the graph, start DFS from child of x (called y).
  For each descendent of y (called z) remove the edge x,z
  */
  for (const [parent, children] of dataGraph.graph) {
    for (const child of children) {
      for (const descendent of dataGraph.getDescendents(child)) {
        if (dataGraph.edges.has(`${parent},${descendent}`)) {
          console.log(`Removing edge from ${parent} to ${descendent}`);
          dataGraph.removeEdge(parent, descendent);
        }
      }
    }
  }
}

function convertDataGraphToDagre(dataGraph) {
  let g = newGraph();

  // Clone attrs here becaues otherwise when we render the renderGraph it will add attributes to the dataGraph.
  for (const [id, nodeAttrs] of dataGraph.nodes.entries()) {
    const nodeAttrsClone = structuredClone(nodeAttrs);
    g.setNode(id, {
      ...nodeAttrsClone,
      // Round the corners of the nodes
      rx: 5,
      ry: 5,
    });
  }

  for (const [edge, edgeAttrs] of dataGraph.edges.entries()) {
    let [source, target] = edge.split(',');
    const edgeAttrsClone = structuredClone(edgeAttrs);
    g.setEdge(source, target, edgeAttrsClone);
  }

  return g;
}

function topologicalSort(graph) {
  const visited = new Set();
  const stack = [];

  for (const node of graph.nodes.keys()) {
    if (!visited.has(node)) {
      topologicalSortHelper(graph, node, visited, stack);
    }
  }

  return stack.reverse();
}

function topologicalSortHelper(graph, node, visited, stack) {
  visited.add(node);

  for (const neighbor of graph.getChildren(node)) {
    if (!visited.has(neighbor)) {
      topologicalSortHelper(graph, neighbor, visited, stack);
    }
  }

  stack.push(node);
}

/* End graph functions */

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
  dataGraph.setEdge(sourceNode(), nodeId);
  // Don't do the below in case you want to set multiple children
  // setSourceNode(undefined);
}

function nodeClickListener(event) {
  let nodeId = event.target.__data__;
  processNodeClick(nodeId, sourceNode, setSourceNode);
}

function reflectList() {
  if (sourceNode() === undefined) {
    console.log('reflectList sourceNode is undefined');
    console.log(`reflectList sources: ${dataGraph.sources()}`);
    return dataGraph.sources();
  }
  console.log(`reflectList sourceNode is ${sourceNode()}`);
  let unconnectedNodes = dataGraph.getUnconnectedNodes(sourceNode());
  let orderedUnconnectedNodes = topologicalSort(dataGraph).filter(n => unconnectedNodes.has(n));
  console.log(`reflectList orderedUnconnectedNodes: ${orderedUnconnectedNodes}`);
  return orderedUnconnectedNodes;
}

function fetchAppStateFromLocalStorage() {
  let json = localStorage.getItem('appState');
  let appState = json !== null ? JSON.parse(json) : {};
  return appState;
}

function fetchGraphFromLocalStorage() {
  let json = localStorage.getItem('dataGraph');
  let jsonGraph = jsonToGraph(json);
  // TODO Is it even necessary to serialize it to json?
  if (jsonGraph !== null) {
    console.log('Loading jsonGraph from localStorage');
    // TODO Save this name in appState
    setGraphName("");
    updateDataGraphFromJsonGraph(dataGraph, jsonGraph);
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
/* End of non-graph functions */

/* Start of components */
/* End of components */

// https://www.d3indepth.com/zoom-and-pan/
const zoom = d3.zoom()
  // TODO constrain zoom and pan.
  // .scaleExtent([1, 5])
  // .translateExtent([[0, 0], [width, height]])
  .on('zoom', handleZoom);

// Global signals. TODO should probably use context in the future.
const [newTitle, setTitle] = createSignal("");
// TODO This probably doesn't need to be a signal.
const [graphName, setGraphName] = createSignal("myGraph.json");
const [sourceNode, setSourceNode] = createSignal(undefined);
const [todos, setTodos] = createSignal([]);
let dataGraph = new DataGraph()
// TODO Interesting that it's not necessary to set numEdits here.
fetchGraphFromLocalStorage();
// let appState = fetchAppStateFromLocalStorage();
const numEdits = dataGraph.numEdits;
const setNumEdits = dataGraph.setNumEdits;

const App = () => {
  console.log('App');

  // let aId = dataGraph.addNode("a");
  // let bId = dataGraph.addNode("b");
  // let cId = dataGraph.addNode("c");
  // let dId = dataGraph.addNode("d");
  // dataGraph.setEdge(aId, bId, {
  //   style: "stroke: #f66; stroke-width: 3px; stroke-dasharray: 5, 5;",
  //   arrowheadStyle: "fill: #f66"
  // });
  // dataGraph.setEdge(bId, cId, {
  //   label: "B to C",
  //   labelStyle: "font-style: italic; text-decoration: underline;"
  // });
  // dataGraph.setEdge(aId, cId, {
  //   label: "line interpolation different",
  //   curve: d3.curveBasis
  // });
  // // dataGraph.removeNode(id1);
  // console.log(dataGraph);
  // // console.log(dataGraph.getNodeIdByLabel('b'));

  let svgGroup2 = d3.select("svg g");
  // Create the renderer
  const renderer = new dagreD3.render();

  let renderGraph = convertDataGraphToDagre(dataGraph);

  // Set up an SVG group so that we can translate the final graph.
  let svgCanvas;
  let svgGroup;

  /* After a click anywhere on screen, if the click is inside the svg but not on a node,
  then clear the source node. */
  https://stackoverflow.com/questions/36695438/detect-click-outside-div-using-javascript
  window.addEventListener('click', genericClickListener);

  // Render the dataGraph into an svg
  createEffect(() => {
    let _ = numEdits();
    console.log('reduce');
    // TODO Race condition with source node? Or removed now that I have the graph produce the signal?
    batch(() => {
      performTransitiveReduction(dataGraph);
    })
    console.log('convert');
    renderGraph = convertDataGraphToDagre(dataGraph);
    console.log('render');
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
  })

  createEffect(() => {
    let _unusedSource = sourceNode();
    let _unusedEdits = numEdits();
    console.log('update node list');
    setTodos(reflectList());
  });

  const addTodo = (e) => {
    e.preventDefault();
    batch(() => {
      dataGraph.addNode(newTitle());
      setTitle("");
    });
  };

  // Save graph to local storage on edit.
  createEffect(() => {
    let _ = numEdits();
    const jsonGraph = graphToJson(dataGraph);
    localStorage.setItem('dataGraph', jsonGraph);
  });

  onMount(() => {
    console.log('mount');
    /* Event Listeners */
    window.addEventListener('keyup', function (e) {
      const key = e.key;
      if (key === "Delete") {
        if (sourceNode() !== undefined) {
          batch(() => {
            dataGraph.removeNodeAndContract(sourceNode());
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
      <button onClick={() => saveFile(dataGraph)}>Save File</button>
      <input type="file" name="" id='inputFile' onChange={(e) => {
        // TODO Not sure about this option chaining.
        let fileObj = e?.target?.files[0];
        setGraphName(fileObj.name);
        loadFile(fileObj);
        resetZoom(svgCanvas, svgGroup, zoom);
      }} hidden></input >
      <button onClick={() => openFile()}>Load File</button>
      <input
        type="text"
        value={graphName()}
        onChange={(e) => setGraphName(e.currentTarget.value)}
      />
      <form onSubmit={addTodo}>
        <input
          placeholder="enter todo and click +"
          required
          value={newTitle()}
          onInput={(e) => setTitle(e.currentTarget.value)}
        />
        <button>+</button>
      </form>
      <svg id="svg-canvas" ref={svgCanvas}>
        <g id="svg-g" ref={svgGroup}></g>
      </svg>
      {/* TODO I think there's some other way of doing this */}
      <div>Source Node: {sourceNode() === undefined ? "" : dataGraph.nodes.get(sourceNode()).label}</div>
      <For each={todos()}>
        {(todo, i) => (
          <div>
            <input
              type="checkbox"
            // checked={todo.done}
            // onChange={(e) => setTodos(i(), "done", e.currentTarget.checked)}
            />
            <input
              type="text"
              value={dataGraph.nodes.get(todo).label}
              onChange={(e) => dataGraph.setNodeLabel(todo, e.currentTarget.value)}
            />
            <button onClick={() => { dataGraph.removeNodeAndContract(todo) }}>
              x
            </button>
            <Show
              when={sourceNode() !== undefined}
              fallback={
                <button onClick={() => { setSourceNode(todo) }}>
                  o
                </button>
              }
            >
              <button onClick={() => { dataGraph.setEdge(sourceNode(), todo) }}>
                {">"}
              </button>
              <button onClick={() => { dataGraph.setEdge(todo, sourceNode()) }}>
                {"<"}
              </button>
            </Show>
          </div>
        )}
      </For>
    </>
  );
};

export default App;