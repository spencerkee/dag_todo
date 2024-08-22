import * as dg from "./dg.js";
export default function TodoList(props) {
    // // Signals
    // sourceNode={sourceNode()}
    // setSourceNode={setSourceNode}
    // numViewEdits={numViewEdits()}
    // setNumDataEdits={setNumDataEdits}
    // // Non-signals
    // todoItems={getSourcesList(V)}
    // D={D}
    // let _ = props.sourceNode();
    // debugger;
    return (
        <div class="todoListContainer">
            {props.title}
            <div class="todoList">
                <For each={props.todoItems} >
                    {(todo, i) => (
                        <div>
                            <input
                                type="checkbox"
                                checked={props.D.nodes.get(todo).completed || false}
                                onChange={(e) => {
                                    props.D.nodes.get(todo).completed = e.target.checked;
                                    console.debug(`checkbox setting numDataEdits=${props.numDataEdits() + 1}`);
                                    setNumDataEdits(props.numDataEdits + 1);
                                }
                                }
                            />
                            <input
                                type="text"
                                value={props.D.nodes.get(todo).label}
                                style={
                                    { width: "40vw" }
                                }
                                onChange={(e) => dg.setNodeLabel(props.D, todo, e.currentTarget.value)}
                            />
                            <button onClick={() => { dg.removeNodeAndContract(props.D, todo) }}>
                                x
                            </button>
                            <button onClick={() => { props.setSourceNode(todo) }}>
                                o
                            </button>
                            {/* Show unconnected nodes view */}
                            <Show
                                when={props.sourceNode !== undefined}
                            >
                                <button onClick={() => { dg.setEdge(props.D, props.sourceNode, todo) }}>
                                    {">"}
                                </button>
                                <button onClick={() => { dg.setEdge(props.D, todo, props.sourceNode) }}>
                                    {"<"}
                                </button>
                            </Show>
                        </div>
                    )
                    }
                </For >
            </div >
        </div>
    );
}