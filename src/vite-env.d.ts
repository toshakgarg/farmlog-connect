/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AZURE_CLIENT_ID: string
  readonly VITE_AZURE_TENANT_ID: string
  readonly VITE_AZURE_COSMOS_CONNECTION_STRING: string
  readonly VITE_AZURE_STORAGE_CONNECTION_STRING: string
  readonly VITE_AZURE_STORAGE_ACCOUNT: string
  readonly VITE_AZURE_VISION_API_KEY: string
  readonly VITE_AZURE_VISION_ENDPOINT: string
  readonly VITE_JWT_SECRET: string
  readonly VITE_GOOGLE_VISION_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}