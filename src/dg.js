// Reads
// Writes
/* Start of non-mutating helpers */
function createNodeId() {
    // TODO consider a different value for the slice.
    return window.crypto.randomUUID().slice(-8);
}

function dfs(G, startId, neighborFunc) {
    if (neighborFunc === undefined) {
        neighborFunc = children;
    }
    const stack = [startId];
    const visited = new Set();
    const result = [];

    while (stack.length) {
        const vertex = stack.pop();

        if (!visited.has(vertex)) {
            visited.add(vertex);
            result.push(vertex);

            for (const child of neighborFunc(G, vertex)) {
                stack.push(child);
            }
        }
    }

    return result;
}

export function topologicalSort(G) {
    const visited = new Set();
    const stack = [];

    for (const node of G.nodes.keys()) {
        if (!visited.has(node)) {
            topologicalSortHelper(G, node, visited, stack);
        }
    }

    return stack.reverse();
}

function topologicalSortHelper(G, node, visited, stack) {
    visited.add(node);

    for (const neighbor of getChildren(G, node)) {
        if (!visited.has(neighbor)) {
            topologicalSortHelper(G, neighbor, visited, stack);
        }
    }

    stack.push(node);
}
/* End non-mutating helpers */

/* Start getters */
// TODO Inefficient.
export function getNodeIdByLabel(G, label) {
    let nodeEntryOrUndef = G.nodes.entries().find(entry => entry[1].label === label);
    if (nodeEntryOrUndef !== undefined) {
        return nodeEntryOrUndef[0];
    }
    throw new Error(`Node with label=${label} not found`);
}

export function getChildren(G, nodeId) {
    return G.graph.get(nodeId) ?? new Set();
}

export function getParents(G, nodeId) {
    let parents = new Set();
    for (let [parent, children] of G.graph.entries()) {
        if (children.has(nodeId)) {
            parents.add(parent);
        }
    }
    return parents;
}

export function getDescendents(G, nodeId) {
    let childrenFn = getChildren;
    let descendants = dfs(G, nodeId, childrenFn);
    // Remove self
    descendants = descendants.slice(1);
    return descendants;
}

export function getAncestors(G, nodeId) {
    let parentFn = getParents;
    let ancestors = dfs(G, nodeId, parentFn);
    // Remove self
    ancestors = ancestors.slice(1);
    return ancestors;
}

export function getUnconnectedNodes(G, nodeId) {
    let allNodes = new Set(G.nodes.keys());
    let connectedNodes = new Set([nodeId]);
    getDescendents(G, nodeId).forEach(connectedNodes.add, connectedNodes);
    getAncestors(G, nodeId).forEach(connectedNodes.add, connectedNodes);
    return allNodes.difference(connectedNodes);
}

export function sources(G) {
    let sources = new Set(G.nodes.keys());
    for (let [_, children] of G.graph.entries()) {
        for (let child of children) {
            sources.delete(child);
        }
    }
    return Array.from(sources);
}
/* End getters */

/* Start setters */
export function addNode(G, label, attrDict) {
    const id = createNodeId();
    if (attrDict !== undefined) {
        G.nodes.set(id, { ...attrDict, label: label });
    } else {
        G.nodes.set(id, { label: label });
    }
    G.graph.set(id, new Set());
    console.debug(`addNode setting G.numDataEdits=${G.numDataEdits() + 1}`);
    G.setNumDataEdits(G.numDataEdits() + 1);
    return id;
}

export function setNodeLabel(G, nodeId, newNodeLabel) {
    if (!G.nodes.has(nodeId)) {
        throw new Error(`Setting node label for id=${nodeId}, but node does not exist`);
    }
    G.nodes.get(nodeId).label = newNodeLabel;
    console.debug(`addNode setting G.numDataEdits=${G.numDataEdits() + 1}`);
    G.setNumDataEdits(G.numDataEdits() + 1);
}

export function removeNode(G, id) {
    if (!G.graph.has(id)) {
        throw new Error(`Removing node with id=${id}, but node does not exist`);
    }
    G.nodes.delete(id);
    G.graph.delete(id);
    // TODO Contract edges etc.

    for (const edgeKey of G.edges.keys()) {
        let [source, target] = edgeKey.split(',');
        if (source === id || target === id) {
            G.edges.delete(edgeKey);
        }
    }
    for (let [_, children] of G.graph.entries()) {
        children.delete(id);
    }
    console.debug(`addNode setting G.numDataEdits=${G.numDataEdits() + 1}`);
    G.setNumDataEdits(G.numDataEdits() + 1);
}

export function removeNodeAndContract(G, id) {
    for (const parent of getParents(G, id)) {
        for (const child of getChildren(G, id)) {
            // TODO How should I handle edges with attributes? Probably prefer the parent.
            setEdge(G, parent, child, G.edges.get(`${parent},${id}`));
        }
    }
    // TODO Incrementing the edits is unecessary because removeNode already does it.
    removeNode(G, id);
}

export function setEdge(G, source, target, attrDict) {
    if (!G.graph.has(source)) {
        throw new Error(`Adding edge between source=${source} and target=${target}, but source=${source} does not exist`);
    }
    if (!G.graph.has(target)) {
        throw new Error(`Adding edge between source=${source} and target=${target}, but target=${target} does not exist`);
    }
    if (G.graph.get(source).has(target)) {
        throw new Error(`Adding edge between source=${source} and target=${target}, but edge already exists`);
    }
    G.graph.get(source).add(target);
    let edgeKey = `${source},${target}`;
    if (attrDict !== undefined) {
        G.edges.set(edgeKey, attrDict);
    } else {
        G.edges.set(edgeKey, {});
    }
    console.debug(`addNode setting G.numDataEdits=${G.numDataEdits() + 1}`);
    G.setNumDataEdits(G.numDataEdits() + 1);
}

export function removeEdge(G, source, target) {
    if (!G.graph.has(source)) {
        throw new Error(`Removing edge between source=${source} and target=${target}, but source=${source} does not exist`);
    }
    if (!G.graph.has(target)) {
        throw new Error(`Removing edge between source=${source} and target=${target}, but target=${target} does not exist`);
    }
    if (!G.graph.get(source).has(target)) {
        throw new Error(`Removing edge between source=${source} and target=${target}, but edge does not exist`);
    }
    G.graph.get(source).delete(target);
    G.edges.delete(`${source},${target}`);
    console.debug(`addNode setting G.numDataEdits=${G.numDataEdits() + 1}`);
    G.setNumDataEdits(G.numDataEdits() + 1);
}
/* End setters */