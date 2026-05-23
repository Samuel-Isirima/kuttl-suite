# @cuttlefish/react

## Setup

```bash
# 1. Build the library
cd interceptjs-react
npm install
npm run build

# 2. Run the demo
cd demo
npm install   # resolves @cuttlefish/react from file:.. (the parent folder)
npm run dev
```

The demo imports `@cuttlefish/react` via `"file:.."` in its package.json — it points at the built `dist/` in the parent folder. No npm publish needed.
