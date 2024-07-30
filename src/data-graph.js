export default class DataGraph {
    constructor() {
        // TODO Should I use objects instead of maps?
        this.nodes = new Map(); // String to object
        this.edges = new Map(); // Array to object
        this.graph = new Map(); // String to Set
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
        return id;
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
    }

    // TODO Inefficient.
    getNodeIdByLabel(label) {
        let nodeEntryOrUndef = this.nodes.entries().find(entry => entry[1].label === label);
        if (nodeEntryOrUndef !== undefined) {
            return nodeEntryOrUndef[0];
        }
        throw new Error(`Node with label=${label} not found`);
    }

    addEdge(source, target, attrDict) {
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
    }
}