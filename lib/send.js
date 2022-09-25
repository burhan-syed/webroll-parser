import tiny from 'tiny-json-http'

const sendURL = process.env.RESPONSE_URL
//const secret = process.env.MY_SECRET_KEY

export const sendPayload = async (payload) => {
  console.log('sending,', payload)
  try {
    let url = `${sendURL}/api/update-site`
    const post = await tiny.post({ url, data: payload })
    return post
  } catch (err) {
    console.error('post error!', err)
  }
}

export const sendImage = async (image, payload) => {
  console.log('SENDING IMAGE>>>')
  let url = `${sendURL}/api/images/upload?id=${encodeURIComponent(
    payload.siteData.id
  )}&url=${encodeURIComponent(payload.siteData.url)}&key=${encodeURIComponent(
    payload.secret
  )}&name=${encodeURIComponent(
    payload.siteData.name
  )}&assigner=${encodeURIComponent(payload.assigner)}`
  try {
    await tiny.post({
      url,
      data: { contents: image },
      headers: { 'content-type': 'application/json' },
    })
    //console.log('image send?', send)
  } catch (err) {
    console.error('image send error', err)
  }
}
