import { CosmosClient } from '@azure/cosmos'
import { cosmosConfig } from './azure'
import { AppUser, FarmerRecord, JOITAPerforma, SurveyQuestion } from './types'

// Initialize Cosmos client
let client: CosmosClient | null = null

function getClient(): CosmosClient {
  if (!client) {
    client = new CosmosClient(cosmosConfig.connectionString)
  }
  return client
}

function getContainer(containerName: string) {
  return getClient()
    .database(cosmosConfig.databaseName)
    .container(containerName)
}

// ============ PASSWORD OPERATIONS ============

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

// ============ USER OPERATIONS ============

export async function getUserByEmail(
  email: string
): Promise<(AppUser & { passwordHash: string }) | null> {
  try {
    const container = getContainer(cosmosConfig.containers.users)
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: email }]
      })
      .fetchAll()
    return resources[0] || null
  } catch {
    return null
  }
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  try {
    const container = getContainer(cosmosConfig.containers.users)
    const { resource } = await container.item(uid, uid).read<AppUser & { passwordHash?: string }>()
    if (!resource) return null
    const { passwordHash: _, ...safeProfile } = resource
    return safeProfile as AppUser
  } catch {
    return null
  }
}

export async function createUserProfile(profile: AppUser & { passwordHash: string }): Promise<void> {
  const container = getContainer(cosmosConfig.containers.users)
  await container.items.upsert({ ...profile, id: profile.uid })
}

export async function getAllUsers(role?: AppUser['role']): Promise<AppUser[]> {
  const container = getContainer(cosmosConfig.containers.users)
  let querySpec = 'SELECT * FROM c ORDER BY c.createdAt DESC'
  if (role) {
    querySpec = `SELECT * FROM c WHERE c.role = '${role}' ORDER BY c.createdAt DESC`
  }
  const { resources } = await container.items.query(querySpec).fetchAll()
  return resources.map((r: any) => {
    const { passwordHash: _, ...safe } = r
    return safe as AppUser
  })
}


// ============ FARMER RECORD OPERATIONS ============

export async function saveFarmerRecord(data: Partial<FarmerRecord>): Promise<string> {
  const container = getContainer(cosmosConfig.containers.farmers)
  const id = data.id || `farmer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const record = {
    ...data,
    id,
    updatedAt: Date.now(),
    createdAt: data.createdAt || Date.now(),
  }
  await container.items.upsert(record)
  return id
}

export async function getFarmerRecord(id: string): Promise<FarmerRecord | null> {
  try {
    const container = getContainer(cosmosConfig.containers.farmers)
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: id }]
      })
      .fetchAll()
    return resources[0] || null
  } catch {
    return null
  }
}

export async function getFarmersBySupervisor(supervisorId: string): Promise<FarmerRecord[]> {
  const container = getContainer(cosmosConfig.containers.farmers)
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.supervisorID = @supervisorId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@supervisorId', value: supervisorId }]
    })
    .fetchAll()
  return resources as FarmerRecord[]
}

export async function getAllFarmerRecords(): Promise<FarmerRecord[]> {
  const container = getContainer(cosmosConfig.containers.farmers)
  const { resources } = await container.items
    .query('SELECT * FROM c ORDER BY c.createdAt DESC')
    .fetchAll()
  return resources as FarmerRecord[]
}

export async function deleteFarmerRecord(id: string): Promise<void> {
  const record = await getFarmerRecord(id)
  if (!record) return
  const container = getContainer(cosmosConfig.containers.farmers)
  await container.item(id, record.supervisorID).delete()
}

// ============ JOITA PERFORMA OPERATIONS ============

export async function saveJOITAPerforma(data: Partial<JOITAPerforma>): Promise<string> {
  const container = getContainer(cosmosConfig.containers.joitaPerformas)
  const id = data.id || `joita_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const record = {
    ...data,
    id,
    updatedAt: new Date().toISOString(),
    createdAt: data.createdAt || new Date().toISOString(),
  }
  await container.items.upsert(record)
  return id
}

export async function getJOITAPerformasBySupervisor(supervisorId: string): Promise<JOITAPerforma[]> {
  const container = getContainer(cosmosConfig.containers.joitaPerformas)
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.supervisorId = @supervisorId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@supervisorId', value: supervisorId }]
    })
    .fetchAll()
  return resources as JOITAPerforma[]
}

export async function getAllJOITAPerformas(): Promise<JOITAPerforma[]> {
  const container = getContainer(cosmosConfig.containers.joitaPerformas)
  const { resources } = await container.items
    .query('SELECT * FROM c ORDER BY c.createdAt DESC')
    .fetchAll()
  return resources as JOITAPerforma[]
}

export async function deleteJOITAPerforma(id: string): Promise<void> {
  try {
    const container = getContainer(cosmosConfig.containers.joitaPerformas)
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: id }]
      })
      .fetchAll()
    if (resources[0]) {
      await container.item(id, resources[0].supervisorId).delete()
    }
  } catch (e) {
    console.error(e)
  }
}

// ============ SURVEY QUESTIONS OPERATIONS ============

export async function getSurveyQuestions(): Promise<SurveyQuestion[]> {
  const container = getContainer(cosmosConfig.containers.surveyQuestions)
  const { resources } = await container.items
    .query('SELECT * FROM c ORDER BY c.order ASC')
    .fetchAll()
  return resources as SurveyQuestion[]
}

export async function saveSurveyQuestion(data: Partial<SurveyQuestion>): Promise<string> {
  const container = getContainer(cosmosConfig.containers.surveyQuestions)
  const id = data.id || `question_${Date.now()}`
  await container.items.upsert({ ...data, id })
  return id
}

export async function deleteSurveyQuestion(id: string): Promise<void> {
  const container = getContainer(cosmosConfig.containers.surveyQuestions)
  await container.item(id, id).delete()
}

export async function updateUserActive(uid: string, active: boolean): Promise<void> {
  const container = getContainer(cosmosConfig.containers.users)
  const { resource } = await container.item(uid, uid).read<AppUser & { passwordHash?: string }>()
  if (resource) {
    await container.item(uid, uid).replace({ ...resource, active })
  }
}

export async function deleteUserProfile(uid: string): Promise<void> {
  const container = getContainer(cosmosConfig.containers.users)
  await container.item(uid, uid).delete()
}
