## Usage

Those templates dependencies are maintained via [pnpm](https://pnpm.io) via `pnpm up -Lri`.

This is the reason you see a `pnpm-lock.yaml`. That being said, any package manager will work. This file can be safely be removed once you clone a template.

```bash
$ npm install # or pnpm install or yarn install
```

### Learn more on the [Solid Website](https://solidjs.com) and come chat with us on our [Discord](https://discord.com/invite/solidjs)

## Available Scripts

In the project directory, you can run:

### `npm run dev` or `npm start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>

### `npm run build`

Builds the app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

## Deployment

You can deploy the `dist` folder to any static host provider (netlify, surge, now, etc.)

# TODO

### 2024-08-02
For storing the graph name, there's a few options.
1) On the graph object itself
    This is fine now, but do I plan on adding many more attributes? Maybe. But that's not so bad.
    Is the filename usually a property of the object itself? I guess so, word and text documents usually know.
    The update patterns of the two things feels weird.
2) In a separate key in local storage
    If you refresh I can load this info. If you load a different file, I would need to clear the name but wouldn't know the neew one.
    No, it should be associated with the object.
3) On the same key in local storage but in some appState object
    My gut is telling me to use this.

I guess either way it would be nice if this info was on the file so you could just load a file and have it.
Ah actually, I can get most of the way there on just reads. Later on chrome can use showSaveFilePicker.

### 2024-07-31
I want to have a signal that's tied with my object. I want to put it on the object itself, but then if I destroy and recreate it I run into issues.
Can I just not do that? Let me try.

Also should maybe split changes into ones that require a transitive reduction and those that don't. E.g. changing the label shouldn't require it.

### 2024-07-29
Instead of hashing nodes I can use a UUID and have a comma delimiter or something.

### 2024-07-24
If I wanted to have a reactive graph, how would I construct it?

Option 1:
- Create a reactive graph class, with my own methods for checking if a path exists between two nodes, and my own store of edge attributes etc.
- Every time it updates, increment the numEdits signal.
- When numEdits updates, recreate the renderGraph and render it.

Option 2:
- Use some off the shelf networkx-esq library.
- Whenever I update it, increment the numEdits signal.
- When numEdits updates, recreate the renderGraph and render it.

Option 3:
- Create a non-reactive graph class with my own methods.
- Every time it updates, increment the numEdits signal.
- When numEdits updates, recreate the renderGraph and render it.

In option 1 I should probably batch changes like transitive reductions etc. That's a lot of reactivity I'm tracking without any gain.
Option 3 vs 2. Easier to write "path exists" etc. Vis, sigma, ngraph. Higher install weight. Learning curve. 

Why do I want to do this stuff again? Oh because I want to switch off of this layout algorithm and not worry about adding weird attributes.
I'll just pick rolling my own.

### Older

How should I construct this? I guess the local store state can include the "data graph".
Then the list will be a function of the datagraph and the selected source node.
Should the source node be a part of the localstore? I think not.
The edit textbox should probably not exist, but instead I should have an edit icon.
The edit icon can turn into a save icon after editing
I'll try constructing the SVG now since there's a tutorial example.

Okay next steps. Try rendering a graph raw from setup data.

When a source node is selected, i'm in neighbor picking mode
When a source node isn't selected, i'm in root picking mode.
Each view needs a for over the nodes.

I could have a show with a fallback, but then the indentation is weird. hard to compare things.
Could instead do a match, which has better indentation. matching on this value being unset.
seems a bit odd to use a match when there's only 2 states. the fallback would never be used for instance.
alternatively could use dynamic and set the value equal to a function.

okay so imagine I have 2 components. Then things are pretty terse actually. I could use show no problem.

How will the data flow work? I'm imagining that I have a data graph. The data graph is pretty terse,
just contains the id, label, edge, possibly color. Then I have a transformation step where I create the render graph.
This involves adding colors, node height/width/shape, click handlers, etc. The click handlers are funny because I want to only add them once per node.


Aaron said to put the source node in a context object and the datagraph in a store. but I think he maybe had a weird ipmression of how solidjs stores worked. Which one makes more sense to do? Props aren't too bad, but I guess that it may get annoying if I have to pass it into every component (which is likely_. Let me think what kind of signals I'll have.

- datagraph.
- selected source node

is there anything else actually? let me think. I guess that's it. Can I just wrap these both in the same provider? Possibly that's not good. It's kind of weird to split it up though. Can you define the same provider multiple times? Probably not. So the datagraph should be a store. 

