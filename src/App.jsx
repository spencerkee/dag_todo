import * as d3 from "d3";
import dagreD3 from "dagre-d3/dist/dagre-d3";
import { batch, createEffect, createSignal, onMount } from "solid-js";
import { createMutable, createStore } from "solid-js/store";
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
  debugger;
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

function addNode(graph, name) {
  graph.setNode(name, {
    label: name,
    // Round the corners of the nodes
    rx: 5,
    ry: 5,
  });
}

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
  let allNodes = new Set(graph.nodes());
  let connectedNodes = new Set([node]);
  getDescendents(graph, node).forEach(connectedNodes.add, connectedNodes);
  getAncestors(graph, node).forEach(connectedNodes.add, connectedNodes);
  let unconnectedNodes = allNodes.difference(connectedNodes);
  let orderedUnconnectedNodes = topologicalSort(g).filter(n => unconnectedNodes.has(n));
  return orderedUnconnectedNodes;
}

function getDescendents(graph, node) {
  let descendants = dfs(graph, node, 'successors');
  // Remove self
  descendants = descendants.slice(1);
  return descendants;
}

function getAncestors(graph, node) {
  let ancestors = dfs(graph, node, 'predecessors');
  // Remove self
  ancestors = ancestors.slice(1);
  return ancestors;
}

function countIncomingEdges(graph, node) {
  return graph.edges().filter(edge => edge.w === node).length;
}

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
    const finalChildren = new Set(graph.successors(u));

    // Go over all neighbouring nodes (retrieve it once more since we'll modify uNeighbours)
    for (const v of graph.successors(u)) {
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

  if (node_or_null === null && svg_or_null !== null) {
    // Clicked inside box, but not on a node so clear source node.
    // clearSourceNode();
    console.log('window clearing source node');
    setSourceNode(undefined);
    // updateList();

    // Could set the graph label if we want.
    // d3.select("#graphLabel").text("");
  }
}

function processNodeClick(nodeName) {
  // First click with no source node set.
  if (sourceNode() === undefined) {
    setSourceNode(nodeName);
    // updateList(); // This is done in the next step.
    return;
  }

  // Clear on self click
  if (sourceNode() === nodeName) {
    setSourceNode(undefined);
    return;
  }

  // Add edge
  console.log(`Adding edge from '${sourceNode()}' to '${nodeName}'`);
  renderGraph.setEdge(sourceNode(), nodeName);
  // Don't do the below in case you want to set multiple children
  // setSourceNode(undefined);

  setNumEdits(numEdits() + 1);
}

function nodeClickListener(nodeLabelOrIdOrNotSure) {
  console.log('node clicked', nodeLabelOrIdOrNotSure);
  processNodeClick(nodeLabelOrIdOrNotSure, sourceNode, setSourceNode, numEdits, setNumEdits);
}

/* End of non-graph functions */

/* Start of components */
// function SourceNode(sourceNode) {
//   return <div>Source Node: {sourceNode()}</div>;
// }

/* End of components */

// Global signals. TODO should probably use context in the future.
const [newTitle, setTitle] = createSignal("");
const [sourceNode, setSourceNode] = createSignal("asdf");
const [numEdits, setNumEdits] = createSignal(0);

const App = () => {
  console.log('App');

  let svgGroup2 = d3.select("svg g");
  // Create the renderer
  const renderer = new dagreD3.render();

  let renderGraph = newGraph();

  // Set up an SVG group so that we can translate the final graph.
  let svgCanvas;
  let svgGroup;

  /* After a click anywhere on screen, if the click is inside the svg but not on a node,
  then clear the source node. */
  https://stackoverflow.com/questions/36695438/detect-click-outside-div-using-javascript
  window.addEventListener('click', genericClickListener);

  // Render the graph into an svg
  createEffect(() => {
    let _ = numEdits();
    console.log('reduce');
    renderGraph = performTransitiveReduction(renderGraph);
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

  const addTodo = (e) => {
    e.preventDefault();
    batch(() => {

      // setTodos(todos.length, {
      //   title: newTitle(),
      //   done: false,
      // });
      addNode(renderGraph, newTitle());
      setTitle("");
      setNumEdits(numEdits() + 1);
    });
  };

  onMount(() => {
    console.log('mount');
    setupGraph(renderGraph);
    setNumEdits(numEdits() + 1);
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
      <div>Source Node: {sourceNode()}</div>
      {/*<form onSubmit={addTodo}>
        <input
          placeholder="enter todo and click +"
          required
          value={newTitle()}
          onInput={(e) => setTitle(e.currentTarget.value)}
        />
        <button>+</button>
      </form>*/}

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