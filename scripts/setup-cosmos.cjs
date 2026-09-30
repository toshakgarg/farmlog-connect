require('dotenv').config()
const { CosmosClient } = require('@azure/cosmos')

const client = new CosmosClient(process.env.VITE_AZURE_COSMOS_CONNECTION_STRING || process.env.AZURE_COSMOS_CONNECTION_STRING)

async function setup() {
  console.log('Creating Cosmos DB database and containers...')

  const { database } = await client.databases.createIfNotExists({
    id: 'farmlog'
  })
  console.log('✅ Database created:', database.id)

  const containers = [
    { id: 'users', partitionKey: '/id' },
    { id: 'farmers', partitionKey: '/supervisorID' },
    { id: 'joita_performas', partitionKey: '/supervisorId' },
    { id: 'survey_questions', partitionKey: '/id' },
  ]

  for (const conf of containers) {
    const { container } = await database.containers.createIfNotExists(conf)
    console.log('✅ Container created:', container.id)
  }

  console.log('🎉 Azure Cosmos DB setup complete!')
}

setup().catch(console.error)
