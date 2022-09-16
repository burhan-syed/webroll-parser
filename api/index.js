import chrome from 'chrome-aws-lambda'
import { chromium } from 'playwright-core'
import { serverTiming } from '../lib/helpers.js'
import { putImageObject } from '../lib/bucket.js'
import { sendPayload } from '../lib/send.js'
//import { compressAndConvertImage } from '../lib/image.js'
import he from '../lib/decoder.js'
import Fastify from 'fastify'

const secret = process.env.MY_SECRET_KEY

const app = Fastify({
  logger: process.env.NODE_ENV === 'development' ? true : false,
})

const allowedOrigins = ['localhost', 'web-roll.vercel.app']

const resolveOrigin = (origin) => {
  console.log('resolving', origin)
  if (allowedOrigins.includes(new URL(origin).hostname)) {
    return origin
  }
  return ''
}

const decode = (str) => {
  const text = he.decode(str)
  return text
}

const handleScreenshot = async ({ params, url }) => {
  const { colorScheme, skipCookieBannerClick } = params
  const metadata = {}
  const uploadImage = async (url, screen) => {
    try {
      const imgKey = await putImageObject({ image: screen, siteURL: url })
      //metadata["ETAG"] = data.ETag;
      metadata['imgKey'] = imgKey
      // metadata["imgLocation"] = data.Location;
    } catch (err) {
      console.err("couldn't upload image", err)
    }
  }
  const checkMetas = (html) => {
    const headText = html.split('</head>')?.[0] ?? ''
    const head = decode(headText)
    const metas = head.split('<meta ')
    metas.forEach((meta, i) => {
      if (i === 0) return
      //console.log("meta", meta);
      // if (meta.includes("name=") && meta.includes("content=")) {
      //   const name = meta.split("name=")?.[1]?.split(`"`);
      //   //console.log("name:", name);
      //   const content = meta.split("content=")?.[1]?.split(`"`);
      //   //console.log("content:", content);
      // }
      meta.replace(
        /(property|name)="(.*?)".+content="(.*?)".*\/>/gim,
        (match, p0, p1, p2) => {
          console.log('type', p1, 'P2', p2)
          metadata[p1] = p2
          return ''
        }
      )
    })
    const siteTitle = head?.split('<title>')?.[1]?.split('</title>')?.[0]
    metadata['title'] = siteTitle
  }
  serverTiming.start()
  serverTiming.measure('browserStart')
  const browser = await chromium.launch({
    args: chrome.args,
    executablePath:
      process.env.NODE_ENV !== 'development'
        ? await chrome.executablePath
        : process.platform === 'win32'
        ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
        : process.platform === 'linux'
        ? '/usr/bin/google-chrome'
        : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    ignoreHTTPSErrors: true,
  })

  const page = await browser.newPage({
    viewport: {
      width: 1920,
      height: 1080,
    },
    deviceScaleFactor: 1,
  })
  serverTiming.measure('browserStart')
  serverTiming.measure('pageView')
  if (colorScheme) {
    await page.emulateMedia({ colorScheme })
  }
  const res = await page.goto(url)
  serverTiming.measure('pageView')

  // Hack for accepting cookie banners
  if (!skipCookieBannerClick) {
    const selectors = [
      '[id*=cookie] a',
      '[class*=consent] button',
      '[class*=cookie] a',
      '[id*=cookie] button',
      '[class*=cookie] button',
    ]

    const regex =
      /(Accept all|I agree|Accept|Agree|Agree all|Ich stimme zu|Okay|OK)/

    serverTiming.measure('cookieHack')
    const elements = await page.$(`'${selectors.join(', ')}'`)
    if (elements) {
      for (const el of elements) {
        const innerText = (await el.getProperty('innerText')).toString()
        regex.test(innerText, 'ig') && el.click()
      }
    }

    serverTiming.measure('cookieHack')
  }
  serverTiming.measure('screenshot')
  // Snap screenshot
  const buffer = await page.screenshot()
  //const compressed = await compressAndConvertImage(buffer)
  // console.log('compressed:', compressed)
  let upload = uploadImage(url, buffer)
  const html = await res.text()
  await checkMetas(html)
  serverTiming.measure('screenshot')
  await upload
  await page.close()
  await browser.close()

  return metadata
}

app.get('/', async () => {
  return { hello: 'world' }
})

/**
 * @type {import('fastify').RouteShorthandOptions}
 */
// eslint-disable-next-line no-unused-vars
app.get('/api/parse', async (req, reply) => {
  throw { statusCode: 404, message: 'invalid route' }

  // let { url } = req.query

  // if (req.headers.origin) {
  //   reply.header(
  //     'Access-Control-Allow-Origin',
  //     resolveOrigin(req.headers.origin)
  //   )
  // }

  // if (!url) {
  //   url = req.body?.url ?? undefined
  //   reply.header('Access-Control-Allow-Headers', 'Content-Type')
  //   reply.header('Content-Type', 'application/json')
  //   throw { statusCode: 400, message: 'Missing URL Param' }
  // }

  // try {
  //   // Set the `s-maxage` property to cache at the CDN layer
  //   reply.header('Cache-Control', 's-maxage=31536000, public')
  //   reply.header('Content-Type', 'image/png')

  //   // Generate Server-Timing headers
  //   const metadata = await handleScreenshot({ params: req.query, url })
  //   reply.header('Server-Timing', serverTiming.setHeader())
  //   return JSON.stringify(metadata)
  // } catch (e) {
  //   console.error('Error generating screenshot -', e)
  //   return JSON.stringify({
  //     message: 'Image Capture Failed',
  //     error: e,
  //   })
  // }
})

/**
 * @type {import('fastify').RouteShorthandOptions}
 */
app.post('/api/parse', async (req, reply) => {
  const { url, key, siteID, assigner } = req.body

  // if (!url) {
  //   url = req.body?.url ?? undefined
  // }
  if (req.headers.origin) {
    reply.header(
      'Access-Control-Allow-Origin',
      resolveOrigin(req.headers.origin)
    )
  }
  if (!url) {
    reply.header('Access-Control-Allow-Headers', 'Content-Type')
    reply.header('Content-Type', 'application/json')
    throw { statusCode: 400, message: 'Missing URL Param' }
  }
  if (!key || key !== secret) {
    reply.header('Access-Control-Allow-Headers', 'Content-Type')
    reply.header('Content-Type', 'application/json')
    throw { statusCode: 401, message: 'Unauthorized' }
  }

  try {
    // Set the `s-maxage` property to cache at the CDN layer
    reply.header('Cache-Control', 's-maxage=31536000, public')
    reply.header('Content-Type', 'application/json')

    // Generate Server-Timing headers
    reply.header('Server-Timing', serverTiming.setHeader())

    const metadata = await handleScreenshot({ params: req.query, url })
    const payload = {
      secret: key,
      assigner: assigner,
      siteData: {
        id: siteID,
        description: metadata?.description,
        name: metadata?.title,
        imgKey: metadata.imgKey,
        status: 'REVIEW',
        updatedAt: new Date(),
      },
    }
    // console.log('SEND: ', payload)
    const postResponse = await sendPayload(payload)
    // const postResponse = await post(
    //   'http://localhost:3000/api/update-site',
    //   payload
    // )
    console.log('post response:', postResponse)
    return JSON.stringify(payload)
  } catch (e) {
    console.error('Error generating screenshot -', e)
    return JSON.stringify({
      message: 'Image Capture Failed',
      error: e,
    })
  }
})

export default async (req, res) => {
  await app.ready()
  app.server.emit('request', req, res)
}
