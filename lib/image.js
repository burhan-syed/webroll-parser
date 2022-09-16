import sharp from 'sharp'

export const compressAndConvertImage = async (image) => {
  return await sharp(image).webp({ quality: 50 }).toBuffer()
}
