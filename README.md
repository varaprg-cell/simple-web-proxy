# Simple Proxy 2

A JavaScript-capable web proxy built with MercuryWorkshop Scramjet, BareMux, libcurl transport, and Wisp. Adapted from the AGPL-3.0 Scramjet-App example; see LICENSE. Complete source is available in this repository.

Run with Node.js 22+: `npm install`, then `npm start`. Open http://localhost:8080. On Render, use the existing Free Node service, `npm install` as the build command and `npm start` as the start command. The health endpoint is `/health`.

Search terms open Google search. Website addresses open inside the proxy frame. HTTPS or localhost is required for service workers. Use a current browser with service workers and SharedWorker support.

This deployment permits Google, YouTube, their supporting domains, and example.com. Links to unrelated websites are not supported by this version. Only ports 80 and 443 are permitted; private, loopback, and direct IP destinations are disabled. Each connection permits up to 64 streams total and 24 per destination.

Google and YouTube can reject data-center IP addresses or require verification. Video playback, account login, DRM, and every website are not guaranteed. The framework is experimental. Free hosting has usage limits; streaming can exhaust them quickly. No paid service is required by this application.

Third-party projects: https://github.com/MercuryWorkshop/scramjet and https://github.com/MercuryWorkshop/Scramjet-App
