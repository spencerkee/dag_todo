import { splitProps } from "solid-js";
import * as dg from "./dg.js";
export default function TodoList(props) {
    // TODO Attempting to split out sourceNode so that we don't update the completed checkbox if the sourceNode changes. Instead we try to only update it when todoItems changes, and todoItems is dependent on sourceNode and numViewEdits. Not sure if it works. If I remove it I also don't have the issues I faced when deleting using the delete key before, but I think this reduces the number of updates.
    const [local, others] = splitProps(props, ["sourceNode"]);
    return (
        <div class="flexDirCol">
            {props.title}
            <div class="flexDirRow">
                <For each={props.todoItems} >
                    {(todo, i) => (
                        <div>
                            <input
                                type="checkbox"
                                checked={props.D.nodes.get(todo).completed || false}
                                onChange={(e) => {
                                    dg.setNode(props.D, todo, {
                                        ...props.D.nodes.get(todo),
                                        completed: e.target.checked
                                    });
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
                                when={local.sourceNode !== undefined}
                            >
                                <button onClick={() => { dg.addEdge(props.D, local.sourceNode, todo) }}>
                                    {">"}
                                </button>
                                <button onClick={() => { dg.addEdge(props.D, todo, local.sourceNode) }}>
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