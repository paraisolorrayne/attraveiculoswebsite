/**
 * Migration Script: Local Storage to Supabase
 * 
 * This script migrates:
 * 1. Audio files from public/uploads/sounds/ to Supabase Storage
 * 2. Vehicle sounds metadata from data/vehicle-sounds.json to Supabase Database
 * 
 * Usage: npx tsx scripts/migrate-to-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const AUDIO_BUCKET = 'audio-files'

interface VehicleSoundRecord {
  id: string
  vehicle_id: string
  vehicle_name: string
  vehicle_brand: string
  vehicle_slug: string
  sound_file_url: string
  description: string | null
  icon: string
  is_electric: boolean
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

async function main() {
  console.log('🚀 Starting migration to Supabase...\n')

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Step 1: Check if bucket exists, create if not
  console.log('📦 Checking storage bucket...')
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === AUDIO_BUCKET)

  if (!bucketExists) {
    console.log(`   Creating bucket "${AUDIO_BUCKET}"...`)
    const { error } = await supabase.storage.createBucket(AUDIO_BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave'],
    })
    if (error) {
      console.error('❌ Failed to create bucket:', error.message)
      process.exit(1)
    }
    console.log('   ✅ Bucket created!')
  } else {
    console.log('   ✅ Bucket already exists!')
  }

  // Step 2: Read existing vehicle sounds from JSON
  console.log('\n📄 Reading existing vehicle sounds...')
  const soundsFilePath = path.join(process.cwd(), 'data', 'vehicle-sounds.json')
  
  let existingSounds: VehicleSoundRecord[] = []
  try {
    const data = fs.readFileSync(soundsFilePath, 'utf-8')
    existingSounds = JSON.parse(data)
    console.log(`   Found ${existingSounds.length} sound(s) to migrate`)
  } catch {
    console.log('   No existing sounds found (data/vehicle-sounds.json not found or empty)')
  }

  // Step 3: Upload audio files and update URLs
  console.log('\n🎵 Migrating audio files...')
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'sounds')
  
  for (const sound of existingSounds) {
    if (sound.sound_file_url.startsWith('/uploads/sounds/')) {
      const filename = path.basename(sound.sound_file_url)
      const localFilePath = path.join(uploadsDir, filename)

      if (fs.existsSync(localFilePath)) {
        console.log(`   Uploading: ${filename}`)
        const fileBuffer = fs.readFileSync(localFilePath)
        const filePath = `sounds/${filename}`

        const { data, error } = await supabase.storage
          .from(AUDIO_BUCKET)
          .upload(filePath, fileBuffer, {
            contentType: 'audio/mpeg',
            upsert: true,
          })

        if (error) {
          console.error(`   ❌ Failed to upload ${filename}:`, error.message)
          continue
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(AUDIO_BUCKET)
          .getPublicUrl(filePath)

        sound.sound_file_url = urlData.publicUrl
        console.log(`   ✅ Uploaded: ${filename}`)
      } else {
        console.warn(`   ⚠️ File not found: ${localFilePath}`)
      }
    }
  }

  // Step 4: Insert records into Supabase Database
  console.log('\n💾 Migrating database records...')
  for (const sound of existingSounds) {
    const { id, created_at, updated_at, ...insertData } = sound
    
    const { error } = await supabase
      .from('vehicle_sounds')
      .upsert({
        ...insertData,
        id, // Keep original ID
      }, { onConflict: 'vehicle_id' })

    if (error) {
      console.error(`   ❌ Failed to insert sound for ${sound.vehicle_name}:`, error.message)
    } else {
      console.log(`   ✅ Migrated: ${sound.vehicle_name}`)
    }
  }

  console.log('\n🎉 Migration complete!')
  console.log('\n📋 Next steps:')
  console.log('   1. Test the application locally')
  console.log('   2. Add SUPABASE_SERVICE_ROLE_KEY to .env.production no servidor')
  console.log('   3. Deploy to production')
}

main().catch(console.error)

