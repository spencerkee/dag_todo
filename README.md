# dag_todo

[ "rank=same for roots", "pres key to swap between deps/priority", "editing nodes via side textbox", "animations or reduced movement", "zoom to fit", "descriptions", "topological sort of potential connections to make", "show remaining possible comparisons for node", "fix zoom on load issue", "ctrl + z", … ]

I need a way to look up a node from the label
Actually not necessarily.

If I need a hash can do https://stackoverflow.com/questions/32649704/how-to-generate-hash-from-timestamp

Hmm, the assumption that all nodes are unique is actually not the best. Probably need to move to this
id based method eventually.

Okay whats the ideal flow?
- Some way of getting the dagre node given the label.
- Some way of editing a dagre node given the ID.

The label doesn't need to be a hash imediately. That makes things hard to read.
Alternatively I can think of an easier way of getting all the parents and children of a node.

oh wow when you use graph.edge() or graph.node() there's an elem property

- g.sources()
    - all nodes with no predecessors
- g.sinks()
    - all nodes with no successors i.e. leaves
- g.setParent(v, parent)
- g.parent(v)
    - only applies in compound graphs I think?
- g.children(v)
    - only applies in compound graphs I think?
- g.predecessors(v)
    - imediate predecessors
- g.successors(v)
    - imediate successors
- g.neighbors(v)
    - predecessors and successors

<!-- 
TODO
https://www.d3indepth.com/zoom-and-pan/
https://stackoverflow.com/questions/36667194/dagre-d3-js-zoom-fit-to-all-contents
https://using-d3js.com/08_01_events.html#h_42s6Es9avmjavasc good looking website

rank 
https://github.com/dagrejs/dagre/pull/90
https://github.com/dagrejs/dagre/issues/54
https://github.com/dagrejs/dagre-d3/issues/165
https://github.com/dagrejs/dagre/pull/271
 -->