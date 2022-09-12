# 📸 Webroll Site Parser
Parses head content and takes screenshot of submitted sites for webroll. Hosted seperately due to package bundling size limits with Lambda functions.

## 🚀 Getting Started

To run this yourself, you'll only need somewhere to host a Next.js application, like Vercel, Netlify, or a server of your own.

1. Clone the repository

```sh
$ git clone <REPO URL>
$ cd <REPO FOLDER>
```

2. Install dependencies

```sh
$ pnpm install
```

3. Run the dev server

```sh
$ pnpm dev:vercel
```

You should now have an API Route up and running at [`http://localhost:3000/api/parse`](http://localhost:3000/api/parse). When pushing to production, don't forget to adjust the CORS header, `Access-Control-Allow-Origin`, to allow your main applications origin to make requests.

## 🏗 Credits

Original from github.com/ndom91/briefkasten-screenshot

