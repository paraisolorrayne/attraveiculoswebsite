import { NextResponse } from 'next/server'
import { ICONIC_CARS } from '@/lib/iconic-cars'
import { snapshotExternalImages } from '@/lib/supabase/storage'

/**
 * POST /api/iconic/snapshot
 *
 * One-shot endpoint that snapshots the 8 iconic-car photos from the AutoConf
 * S3 bucket into the Supabase blog-images bucket, preventing link rot.
 *
 * Protected by CRON_SECRET. Run once, then update iconic-cars.ts with the
 * returned Supabase URLs.
 */
export async function POST(request: Request) {
	const cronSecret = process.env.CRON_SECRET
	if (!cronSecret) {
		return NextResponse.json(
			{ error: 'CRON_SECRET not configured' },
			{ status: 500 },
		)
	}

	const authHeader = request.headers.get('authorization')
	if (authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const urls = ICONIC_CARS.map(car => car.photo)
	const mapped = await snapshotExternalImages(urls)

	const results = ICONIC_CARS.map(car => ({
		id: car.id,
		brand: car.brand,
		model: car.model,
		originalUrl: car.photo,
		snapshotUrl: mapped[car.photo] ?? car.photo,
		migrated: (mapped[car.photo] ?? car.photo) !== car.photo,
	}))

	return NextResponse.json({
		total: results.length,
		migrated: results.filter(r => r.migrated).length,
		results,
	})
}
