import tiny from 'tiny-json-http'

export const sendPayload = async (payload) => {
  console.log('sending,', payload)
  try {
    let url = process.env.RESPONSE_URL
    const post = await tiny.post({ url, data: payload })
    return post
  } catch (err) {
    console.error('post error!', err)
  }
}
