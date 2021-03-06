const { createClient, getConfig, getEnv } = require('../server/db')

// See https://www.postgresql.org/docs/13/errcodes-appendix.html
const DUPLICATE_DATABASE_ERROR = '42P04'

bootstrapDatabase()

async function bootstrapDatabase () {
  const targetEnv = getEnv()
  if (targetEnv === 'production') {
    throw new Error('This script should not be used in production!')
  }

  const config = getConfig(targetEnv)
  await createDatabase(config)
  await migrateToLatestSchemas(config)
  //await runDataSeeders(config)
}

async function createDatabase (config) {
  const { database } = config.connection
  let db

  try {
    // Connect with system database selected
    db = createClient({
      ...config,
      connection: {
        ...config.connection,
        database: 'postgres'
      }
    })

    // Create the database if it doesn't already exist
    await db.raw(`CREATE DATABASE ${database}`)
    console.log(`Created database "${database}"!`)
  } catch (error) {
    if (error.code === DUPLICATE_DATABASE_ERROR) {
      console.warn(`Error creating database "${database}": it already exists!`)
    } else {
      console.error(`Error creating database "${database}": ${error.message}`)
      throw error
    }
  } finally {
    // Disconnect
    await db.destroy()
  }
}

async function migrateToLatestSchemas (config) {
  const { database } = config.connection
  let db

  try {
    db = createClient(config)
    await db.migrate.latest()
    console.log(`Migrated database "${database}" to latest schemas!`)
  } catch (error) {
    console.error(`Error migrating to latest schemas for database "${database}": ${error.message}`)
    throw error
  } finally {
    // Disconnect
    await db.destroy()
  }
}

async function runDataSeeders (config) {
  const { database } = config.connection
  let db

  try {
    db = createClient(config)
    await db.seed.run()
    console.log(`Created seed data in database "${database}"!`)
  } catch (error) {
    console.error(`Error creating seed data for database "${database}": ${error.message}`)
    throw error
  } finally {
    // Disconnect
    await db.destroy()
  }
}
