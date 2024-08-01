import * as d3 from "d3";
import dagreD3 from "dagre-d3/dist/dagre-d3";
import { batch, createEffect, createSignal, onMount } from "solid-js";
import { createMutable, createStore } from "solid-js/store";
import DataGraph from "./data-graph";
import "./index.css";

function removeIndex(array, index) {
  return [...array.slice(0, index), ...array.slice(index + 1)];
}

function createLocalStore(name, init) {
  const localState = localStorage.getItem(name);
  const [appState, setAppState] = createStore(
    localState ? JSON.parse(localState) : init
  );
  createEffect(() => localStorage.setItem(name, JSON.stringify(appState)));
  return [appState, setAppState];
}

function createLocalMutable(name, init) {
  const localState = localStorage.getItem(name);
  const [appState, setAppState] = createMutable(
    localState ? JSON.parse(localState) : init
  );
  createEffect(() => localStorage.setItem(name, JSON.stringify(appState)));
  return [appState, setAppState];
}

function saveFile(state) {
  let json = JSON.stringify(state)
  let a = document.createElement("a")
  a.href = URL.createObjectURL(
    new Blob([json], { type: "application/json" })
  )
  let now = new Date();
  a.download = `test-${now.toISOString()}.json`
  a.click()
}

function newGraph() {
  return new dagreD3.graphlib.Graph()
    .setGraph({ rankdir: "LR" })
    .setDefaultEdgeLabel(function () { return {}; });
}

function setupGraph(g) {
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

function GraphSvg(graph) {
  let g = newGraph();
  setupGraph(g);
  return g;
}

// function DataGraphProvider(props) {
//   const [count, setCount] = createSignal(props.count || 0),
//     counter = [
//       count,
//       {
//         increment() {
//           setCount(c => c + 1);
//         },
//         decrement() {
//           setCount(c => c - 1);
//         }
//       }
//     ];

//   return (
//     <CounterContext.Provider value={counter}>
//       {props.children}
//     </CounterContext.Provider>
//   );
// }

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

  for (const [id, nodeAttrs] of dataGraph.nodes.entries()) {
    g.setNode(id, {
      ...nodeAttrs,
      // Round the corners of the nodes
      rx: 5,
      ry: 5,
    });
  }

  for (const [edge, edgeAttrs] of dataGraph.edges.entries()) {
    let [source, target] = edge.split(',');
    g.setEdge(source, target, edgeAttrs);
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

function nodeClickListener(nodeId) {
  console.log('node clicked', nodeId);
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

/* End of non-graph functions */

/* Start of components */
// function SourceNode(sourceNode) {
//   return <div>Source Node: {sourceNode()}</div>;
// }

/* End of components */

// Global signals. TODO should probably use context in the future.
const [newTitle, setTitle] = createSignal("");
const [sourceNode, setSourceNode] = createSignal(undefined);
const [todos, setTodos] = createSignal([]);
let dataGraph = new DataGraph();
const numEdits = dataGraph.numEdits;
const setNumEdits = dataGraph.setNumEdits;

const App = () => {
  console.log('App');

  let aId = dataGraph.addNode("a");
  let bId = dataGraph.addNode("b");
  let cId = dataGraph.addNode("c");
  dataGraph.setEdge(aId, bId, {
    style: "stroke: #f66; stroke-width: 3px; stroke-dasharray: 5, 5;",
    arrowheadStyle: "fill: #f66"
  });
  dataGraph.setEdge(bId, cId, {
    label: "B to C",
    labelStyle: "font-style: italic; text-decoration: underline;"
  });
  dataGraph.setEdge(aId, cId, {
    label: "line interpolation different",
    curve: d3.curveBasis
  });
  // dataGraph.removeNode(id1);
  console.log(dataGraph);
  // console.log(dataGraph.getNodeIdByLabel('b'));

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
    let _ = sourceNode();
    // TODO also need dependency on the graph.
    console.log('update node list');
    setTodos(reflectList());
  });

  const addTodo = (e) => {
    e.preventDefault();
    batch(() => {

      // setTodos(todos.length, {
      //   title: newTitle(),
      //   done: false,
      // });
      dataGraph.addNode(newTitle());
      setTitle("");
    });
  };

  onMount(() => {
    console.log('mount');
  });

  return (
    <>
      <h3>TODO Dag</h3>
      <button onClick={() => saveFile(appState)}>Save File</button>
      <button>Load File</button>
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
      {/*<form onSubmit={addTodo}>
        <input
          placeholder="enter todo and click +"
          required
          value={newTitle()}
          onInput={(e) => setTitle(e.currentTarget.value)}
        />
        <button>+</button>
      </form>*/}

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
            // onChange={(e) => setTodos(i(), "title", e.currentTarget.value)}
            />
            <button onClick={() => setTodos((t) => removeIndex(t, i()))}>
              x
            </button>
          </div>
        )}
      </For>

      {/*<For each={todos}>
        {(todo, i) => (
          <div>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={(e) => setTodos(i(), "done", e.currentTarget.checked)}
            />
            <input
              type="text"
              value={todo.title}
              onChange={(e) => setTodos(i(), "title", e.currentTarget.value)}
            />
            <button onClick={() => setTodos((t) => removeIndex(t, i()))}>
              x
            </button>
          </div>
        )}
      </For>*/}
    </>
  );
};

export default App;