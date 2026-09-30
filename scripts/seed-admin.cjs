require('dotenv').config()
const { CosmosClient } = require('@azure/cosmos')
const crypto = require('crypto')

const client = new CosmosClient(
  process.env.VITE_AZURE_COSMOS_CONNECTION_STRING || process.env.AZURE_COSMOS_CONNECTION_STRING
)

async function hashPassword(password) {
  const hash = crypto.createHash('sha256').update(password).digest('hex')
  return hash
}

async function seedAdmin() {
  const db = client.database('farmlog')
  const container = db.container('users')

  const passwordHash = await hashPassword('Admin@123')

  const adminUser = {
    id: 'admin_001',
    uid: 'admin_001',
    email: 'admin@farmlog.com',
    name: 'Admin',
    role: 'admin',
    active: true,
    createdAt: Date.now(),
    passwordHash,
  }

  await container.items.upsert(adminUser)
  console.log('✅ Admin account created')
  console.log('   Email: admin@farmlog.com')
  console.log('   Password: Admin@123')
  console.log('   Change password after first login!')
}

seedAdmin().catch(console.error)
