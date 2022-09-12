import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

import crypto from 'crypto'

const bucket = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_BUCKET_REGION
const accessKeyId = process.env.MY_AWS_ACCESS_KEY
const secretAccessKey = process.env.MY_AWS_SECRET_KEY
const s3 = new S3Client({
  credentials: { accessKeyId, secretAccessKey },
  region: region,
})

const randomImageName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString('hex')

export const putImageObject = async ({ image, siteURL }) => {
  const imgKey = randomImageName()
  const params = {
    Body: image,
    Bucket: bucket,
    Key: imgKey,
    Metadata: { siteURL: siteURL },
    ContentType: 'image/png',
  }
  const command = new PutObjectCommand(params)
  const res = await s3.send(command)
  console.log('upload:', res, imgKey)
  return imgKey
}
