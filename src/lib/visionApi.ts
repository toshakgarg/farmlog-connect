import { visionConfig } from './azure'

export interface VisionResult {
  rawText: string
  confidence: number
}

export async function extractTextFromImage(imageBase64: string): Promise<VisionResult> {
  if (!visionConfig.apiKey || !visionConfig.endpoint) {
    throw new Error('Azure Vision API not configured')
  }

  // Convert base64 to binary
  const byteString = atob(imageBase64.split(',')[1] || imageBase64)
  const byteArray = new Uint8Array(byteString.length)
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i)
  }

  // Call Azure Computer Vision OCR endpoint
  const url = `${visionConfig.endpoint.replace(/\/$/, '')}/computervision/imageanalysis:analyze?api-version=2024-02-01&features=read&language=hi`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': visionConfig.apiKey,
      'Content-Type': 'application/octet-stream',
    },
    body: byteArray,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Azure Vision API error: ${response.status} - ${error}`)
  }

  const data = await response.json()

  // Extract all text from read results
  const lines: string[] = []
  data.readResult?.blocks?.forEach((block: any) => {
    block.lines?.forEach((line: any) => {
      lines.push(line.text)
    })
  })

  const rawText = lines.join('\n')

  return {
    rawText,
    confidence: data.readResult?.blocks?.[0]?.lines?.[0]?.words?.[0]?.confidence ?? 0.8
  }
}
