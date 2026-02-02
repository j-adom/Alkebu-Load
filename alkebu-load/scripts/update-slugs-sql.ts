#!/usr/bin/env tsx

/**
 * Directly update database to add slugs to products
 */

import dotenv from 'dotenv'
import pg from 'pg'
const { Pool } = pg

dotenv.config({ path: './.env' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URI
})

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function updateSlugs() {
  try {
    console.log('🔧 Connecting to database...')

    // Get all products without slugs
    const result = await pool.query(`
      SELECT id, name, slug, price FROM fashion_jewelry
    `)

    console.log(`📦 Found ${result.rows.length} products\n`)

    for (const row of result.rows) {
      const slug = row.slug || slugify(row.name)
      const price = row.price || 25.00

      await pool.query(`
        UPDATE fashion_jewelry
        SET slug = $1, price = $2
        WHERE id = $3
      `, [slug, price, row.id])

      console.log(`✅ Updated: ${row.name} → ${slug} ($${price})`)
    }

    console.log(`\n✅ Complete!`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await pool.end()
    process.exit(0)
  }
}

updateSlugs()
