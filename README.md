# Simple Web Proxy

A basic Node.js website proxy for text, images, CSS, and links. This is a limited page viewer, not a full remote browser. JavaScript, forms, logins, video, and downloads are not supported. Some sites block server requests. HTML is interpreted as UTF-8.

## Run locally

Install Node.js 22 or newer, then run `npm install` and `npm start`. Open http://localhost:8080.

## Deploy on Render

Create a Web Service from this repository. Select Node, build command `npm install`, start command `npm start`, and instance type **Free**. Set the health-check path to `/health`. No database, disk, or paid add-on is needed.

Free hosting has monthly usage limits and sleeps when idle. Do not add a payment method if you want over-limit services paused rather than charged. High outgoing traffic can cause a suspension that requires a paid upgrade; it is not guaranteed to reset monthly.

## Limits

Only public IPv4 destinations on HTTP/HTTPS ports are supported. DNS addresses are checked and pinned on each redirect. Each response is limited to 5 MB; requests time out after 20 seconds, with at most 8 concurrent requests and 300 requests per minute across the service. Scripts and forms are disabled with a sandbox policy. No client cookies or credentials are sent upstream. These limits reduce resource usage but do not guarantee that a public deployment will remain within free hosting allowances.
