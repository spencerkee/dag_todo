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

function addNode(g, node) {
  g.setNode(node, { label: node });
}

const App = () => {
  const [newTitle, setTitle] = createSignal("");
  const [numEdits, setNumEdits] = createSignal(0);
  console.log('App');

  let svgGroup2 = d3.select("svg g");
  // Create the renderer
  const renderer = new dagreD3.render();

  let dataGraph = newGraph();

  createEffect(() => {
    let _ = numEdits();
    console.log('render');
    renderer(d3.select(svgGroup), dataGraph);
  })
  const addTodo = (e) => {
    e.preventDefault();
    batch(() => {

      // setTodos(todos.length, {
      //   title: newTitle(),
      //   done: false,
      // });
      addNode(dataGraph, newTitle());
      setTitle("");
      setNumEdits(numEdits() + 1);
    });
  };

  // Set up an SVG group so that we can translate the final graph.
  let svgCanvas;
  let svgGroup;

  onMount(() => {
    console.log('mount');
    setupGraph(dataGraph);
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
      {/*<Portal>*/}
      <svg id="svg-canvas" ref={svgCanvas}>
        <g id="svg-g" ref={svgGroup}></g>
      </svg>
      {/*</Portal>*/}
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