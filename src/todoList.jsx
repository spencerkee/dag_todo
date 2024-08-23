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
                    {(todoItem, i) => (
                        <div>
                            {todoItem.numParents}
                            <input
                                type="checkbox"
                                checked={todoItem.completed || false}
                                onChange={(e) => {
                                    dg.setNode(props.D, todoItem.id, {
                                        ...todoItem,
                                        completed: e.target.checked
                                    });
                                }
                                }
                            />
                            <input
                                type="text"
                                value={todoItem.label}
                                style={
                                    { width: "40vw" }
                                }
                                onChange={(e) => dg.setNodeLabel(props.D, todoItem.id, e.currentTarget.value)}
                            />
                            <button onClick={() => { dg.removeNodeAndContract(props.D, todoItem.id) }}>
                                x
                            </button>
                            <button onClick={() => { props.setSourceNode(todoItem.id) }}>
                                o
                            </button>
                            {/* Show unconnected nodes view */}
                            <Show
                                when={local.sourceNode !== undefined}
                            >
                                <button onClick={() => { dg.addEdge(props.D, local.sourceNode, todoItem.id) }}>
                                    {">"}
                                </button>
                                <button onClick={() => { dg.addEdge(props.D, todoItem.id, local.sourceNode) }}>
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