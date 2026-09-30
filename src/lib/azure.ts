// Azure configuration — all values from environment variables

// Cosmos DB config
export const cosmosConfig = {
  connectionString: import.meta.env.VITE_AZURE_COSMOS_CONNECTION_STRING as string,
  databaseName: 'farmlog',
  containers: {
    users: 'users',
    farmers: 'farmers',
    joitaPerformas: 'joita_performas',
    surveyQuestions: 'survey_questions',
  }
}

// Blob Storage config
export const blobConfig = {
  connectionString: import.meta.env.VITE_AZURE_STORAGE_CONNECTION_STRING as string,
  containerName: 'farmlog-photos',
  accountName: import.meta.env.VITE_AZURE_STORAGE_ACCOUNT as string,
}

// Computer Vision config
export const visionConfig = {
  apiKey: import.meta.env.VITE_AZURE_VISION_API_KEY as string,
  endpoint: import.meta.env.VITE_AZURE_VISION_ENDPOINT as string,
}

// Validate all required env vars on startup
export function validateAzureConfig(): { valid: boolean; missing: string[] } {
  const required = [
    'VITE_AZURE_COSMOS_CONNECTION_STRING',
    'VITE_AZURE_STORAGE_CONNECTION_STRING',
    'VITE_AZURE_VISION_API_KEY',
    'VITE_AZURE_VISION_ENDPOINT',
  ] as const
  const missing = required.filter(key => !import.meta.env[key as keyof ImportMetaEnv])
  return { valid: missing.length === 0, missing: missing as unknown as string[] }
}