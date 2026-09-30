require('dotenv').config()
const admin = require('firebase-admin')
const { CosmosClient } = require('@azure/cosmos')
const { readFileSync } = require('fs')

// Initialize Firebase Admin
try {
  const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'))
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
} catch (e) {
  console.log('No firebase-service-account.json found. Skipping migration.')
  process.exit(0)
}
const db = admin.firestore()

// Initialize Cosmos
const cosmosClient = new CosmosClient(
  process.env.VITE_AZURE_COSMOS_CONNECTION_STRING || process.env.AZURE_COSMOS_CONNECTION_STRING
)
const cosmosDb = cosmosClient.database('farmlog')

async function migrateCollection(firebaseCollection, cosmosContainer) {
  console.log(`Migrating ${firebaseCollection}...`)
  try {
    const snapshot = await db.collection(firebaseCollection).get()
    const container = cosmosDb.container(cosmosContainer)

    for (const doc of snapshot.docs) {
      const data = { ...doc.data(), id: doc.id }
      await container.items.upsert(data)
      console.log(`  Migrated: ${doc.id}`)
    }
    console.log(`✅ ${firebaseCollection} done — ${snapshot.size} records`)
  } catch (e) {
    console.error(`❌ Failed to migrate ${firebaseCollection}:`, e.message)
  }
}

async function migrate() {
  await migrateCollection('users', 'users')
  await migrateCollection('farmers', 'farmers')
  await migrateCollection('joita_performas', 'joita_performas')
  await migrateCollection('questions', 'survey_questions') 
  console.log('🎉 Migration complete!')
}

migrate().catch(console.error)
