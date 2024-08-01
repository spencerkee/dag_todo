import { createSignal } from "solid-js";

export default class DataGraph {
    constructor() {
        // TODO Should I use objects instead of maps?
        this.nodes = new Map(); // String to object
        this.edges = new Map(); // Array to object
        this.graph = new Map(); // String to Set
        [this.numEdits, this.setNumEdits] = createSignal(0);
    }

    createNodeId() {
        // TODO consider a different value for the slice.
        return window.crypto.randomUUID().slice(-8);
    }

    addNode(label, attrDict) {
        const id = this.createNodeId();
        if (attrDict !== undefined) {
            this.nodes.set(id, { ...attrDict, label: label });
        } else {
            this.nodes.set(id, { label: label });
        }
        this.graph.set(id, new Set());
        this.setNumEdits(this.numEdits() + 1);
        return id;
    }

    setNodeLabel(nodeId, newNodeLabel) {
        if (!this.nodes.has(nodeId)) {
            throw new Error(`Setting node label for id=${nodeId}, but node does not exist`);
        }
        this.nodes.get(nodeId).label = newNodeLabel;
        this.setNumEdits(this.numEdits() + 1);
    }

    removeNode(id) {
        if (!this.graph.has(id)) {
            throw new Error(`Removing node with id=${id}, but node does not exist`);
        }
        this.nodes.delete(id);
        this.graph.delete(id);
        // TODO Contract edges etc.

        for (const edgeKey of this.edges.keys()) {
            let [source, target] = edgeKey.split(',');
            if (source === id || target === id) {
                this.edges.delete(edgeKey);
            }
        }
        for (let [_, children] of this.graph.entries()) {
            children.delete(id);
        }
        this.setNumEdits(this.numEdits() + 1);
    }

    // TODO Inefficient.
    getNodeIdByLabel(label) {
        let nodeEntryOrUndef = this.nodes.entries().find(entry => entry[1].label === label);
        if (nodeEntryOrUndef !== undefined) {
            return nodeEntryOrUndef[0];
        }
        throw new Error(`Node with label=${label} not found`);
    }

    setEdge(source, target, attrDict) {
        if (!this.graph.has(source)) {
            throw new Error(`Adding edge between source=${source} and target=${target}, but source=${source} does not exist`);
        }
        if (!this.graph.has(target)) {
            throw new Error(`Adding edge between source=${source} and target=${target}, but target=${target} does not exist`);
        }
        if (this.graph.get(source).has(target)) {
            throw new Error(`Adding edge between source=${source} and target=${target}, but edge already exists`);
        }
        this.graph.get(source).add(target);
        let edgeKey = `${source},${target}`;
        if (attrDict !== undefined) {
            this.edges.set(edgeKey, attrDict);
        } else {
            this.edges.set(edgeKey, {});
        }
        this.setNumEdits(this.numEdits() + 1);
    }

    removeEdge(source, target) {
        if (!this.graph.has(source)) {
            throw new Error(`Removing edge between source=${source} and target=${target}, but source=${source} does not exist`);
        }
        if (!this.graph.has(target)) {
            throw new Error(`Removing edge between source=${source} and target=${target}, but target=${target} does not exist`);
        }
        if (!this.graph.get(source).has(target)) {
            throw new Error(`Removing edge between source=${source} and target=${target}, but edge does not exist`);
        }
        this.graph.get(source).delete(target);
        this.edges.delete(`${source},${target}`);
        this.setNumEdits(this.numEdits() + 1);
    }

    dfs(startId, neighborFunc) {
        if (neighborFunc === undefined) {
            neighborFunc = this.children;
        }
        const stack = [startId];
        const visited = new Set();
        const result = [];

        while (stack.length) {
            const vertex = stack.pop();

            if (!visited.has(vertex)) {
                visited.add(vertex);
                result.push(vertex);

                for (const child of neighborFunc(vertex)) {
                    stack.push(child);
                }
            }
        }

        return result;
    }

    getChildren(nodeId) {
        return this.graph.get(nodeId) ?? new Set();
    }

    getParents(nodeId) {
        let parents = new Set();
        for (let [parent, children] of this.graph.entries()) {
            if (children.has(nodeId)) {
                parents.add(parent);
            }
        }
        return parents;
    }

    getDescendents(nodeId) {
        let childrenFn = this.getChildren.bind(this);
        let descendants = this.dfs(nodeId, childrenFn);
        // Remove self
        descendants = descendants.slice(1);
        return descendants;
    }

    getAncestors(nodeId) {
        let parentFn = this.getParents.bind(this);
        let ancestors = this.dfs(nodeId, parentFn);
        // Remove self
        ancestors = ancestors.slice(1);
        return ancestors;
    }

    getUnconnectedNodes(nodeId) {
        // let allNodes = new Set(graph.nodes());
        // let connectedNodes = new Set([node]);
        // getDescendents(graph, node).forEach(connectedNodes.add, connectedNodes);
        // getAncestors(graph, node).forEach(connectedNodes.add, connectedNodes);
        // let unconnectedNodes = allNodes.difference(connectedNodes);
        // let orderedUnconnectedNodes = topologicalSort(g).filter(n => unconnectedNodes.has(n));
        // return orderedUnconnectedNodes;
        let allNodes = new Set(this.nodes.keys());
        let connectedNodes = new Set([nodeId]);
        this.getDescendents(nodeId).forEach(connectedNodes.add, connectedNodes);
        this.getAncestors(nodeId).forEach(connectedNodes.add, connectedNodes);
        return allNodes.difference(connectedNodes);
    }

    sources() {
        let sources = new Set(this.nodes.keys());
        for (let [_, children] of this.graph.entries()) {
            for (let child of children) {
                sources.delete(child);
            }
        }
        return Array.from(sources);
    }
}