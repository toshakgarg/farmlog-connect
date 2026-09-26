if (!import.meta.env['VITE_GOOGLE_VISION_API_KEY']) {
  console.warn('⚠️ VITE_GOOGLE_VISION_API_KEY not set. Form scanning will not work.')
}

const VISION_API_KEY = import.meta.env['VITE_GOOGLE_VISION_API_KEY']
const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`

export interface VisionResult {
  rawText: string
  confidence: number
  blocks: TextBlock[]
}

interface TextBlock {
  text: string
  boundingBox: { x: number; y: number; width: number; height: number }
  confidence: number
}

export async function extractTextFromImage(imageBase64: string): Promise<VisionResult> {
  const requestBody = {
    requests: [{
      image: { content: imageBase64 },
      features: [
        { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
        { type: 'TEXT_DETECTION', maxResults: 50 }
      ],
      imageContext: {
        languageHints: ['hi', 'en'] // Hindi + English
      }
    }]
  }

  const response = await fetch(VISION_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    throw new Error(`Vision API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const annotation = data.responses?.[0]?.fullTextAnnotation

  if (!annotation) {
    throw new Error('No text detected in image')
  }

  const blocks: TextBlock[] = []
  annotation.pages?.[0]?.blocks?.forEach((block: any) => {
    const blockText = block.paragraphs
      ?.map((p: any) => p.words?.map((w: any) => w.symbols?.map((s: any) => s.text).join('')).join(' '))
      .join('\n') || ''
    if (blockText.trim()) {
      blocks.push({
        text: blockText,
        boundingBox: {
          x: block.boundingBox?.vertices?.[0]?.x || 0,
          y: block.boundingBox?.vertices?.[0]?.y || 0,
          width: (block.boundingBox?.vertices?.[2]?.x || 0) - (block.boundingBox?.vertices?.[0]?.x || 0),
          height: (block.boundingBox?.vertices?.[2]?.y || 0) - (block.boundingBox?.vertices?.[0]?.y || 0)
        },
        confidence: block.confidence || 0
      })
    }
  })

  return {
    rawText: annotation.text || '',
    confidence: annotation.pages?.[0]?.confidence || 0,
    blocks
  }
}

