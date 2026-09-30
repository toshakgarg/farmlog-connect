import { blobConfig } from './azure'

// Parse connection string
const connParams = new URLSearchParams(blobConfig.connectionString.replace(/;/g, '&'))
const accountName = connParams.get('AccountName') || blobConfig.accountName
const accountKey = connParams.get('AccountKey')

async function createSharedKeySignature(
  method: string,
  contentLength: number,
  contentType: string,
  date: string,
  canonicalizedResource: string,
  canonicalizedHeaders: string = ''
) {
  if (!accountKey) throw new Error('Storage AccountKey missing')
  
  const stringToSign = [
    method,
    '', // Content-Encoding
    '', // Content-Language
    contentLength || '', // Content-Length
    '', // Content-MD5
    contentType || '', // Content-Type
    '', // Date
    '', // If-Modified-Since
    '', // If-Match
    '', // If-None-Match
    '', // If-Unmodified-Since
    '', // Range
    canonicalizedHeaders,
    canonicalizedResource
  ].join('\n')

  const keyBuffer = Uint8Array.from(atob(accountKey), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(stringToSign)
  )
  return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
}

export async function uploadPhoto(
  base64Data: string,
  fileName: string,
  farmerId: string
): Promise<string> {
  const byteString = atob(base64Data.split(',')[1] || base64Data)
  const byteArray = new Uint8Array(byteString.length)
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i)
  }
  const blob = new Blob([byteArray], { type: 'image/jpeg' })

  const blobName = `farmers/${farmerId}/${Date.now()}_${fileName}`
  const containerName = blobConfig.containerName
  const url = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}`
  
  const date = new Date().toUTCString()
  const canonicalizedHeaders = `x-ms-blob-type:BlockBlob\nx-ms-date:${date}\nx-ms-version:2020-10-02\n`
  const canonicalizedResource = `/${accountName}/${containerName}/${blobName}`
  
  const signature = await createSharedKeySignature(
    'PUT',
    blob.size,
    'image/jpeg',
    date,
    canonicalizedResource,
    canonicalizedHeaders
  )
  
  const authHeader = `SharedKey ${accountName}:${signature}`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': authHeader,
      'x-ms-date': date,
      'x-ms-version': '2020-10-02',
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': 'image/jpeg',
      'Content-Length': blob.size.toString()
    },
    body: blob
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Upload failed: ${response.status} ${err}`)
  }

  return url
}

export async function deletePhoto(blobUrl: string): Promise<void> {
  const urlObj = new URL(blobUrl)
  const path = urlObj.pathname
  const url = `https://${accountName}.blob.core.windows.net${path}`
  
  const date = new Date().toUTCString()
  const canonicalizedHeaders = `x-ms-date:${date}\nx-ms-version:2020-10-02\n`
  const canonicalizedResource = `/${accountName}${path}`
  
  const signature = await createSharedKeySignature(
    'DELETE',
    0,
    '',
    date,
    canonicalizedResource,
    canonicalizedHeaders
  )

  await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `SharedKey ${accountName}:${signature}`,
      'x-ms-date': date,
      'x-ms-version': '2020-10-02'
    }
  })
}
