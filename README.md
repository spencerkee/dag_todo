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

