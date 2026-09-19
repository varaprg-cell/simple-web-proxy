# Vennela Farming

The Vennela Farming mango farm website, using the supplied HTML and embedded farm photograph.

Run `npm start` with Node.js 22 or newer. No packages are required. Render uses its assigned PORT; the local default is 8083. The health check is `/health`.

The former web proxy has been retired. No forwarding, Wisp, CONNECT, or proxy asset routes remain. `sw.js` only unregisters the former service worker for returning visitors.
