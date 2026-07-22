import { NextRequest, NextResponse } from 'next/server'
import type { Updateable } from 'kysely'
import { isAuthenticated } from '@/lib/admin-auth'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { guardSupervisedAction } from '@/lib/admin-supervision'
import { db } from '@/lib/db'
import type { Database } from '@/lib/db/types'
import { deleteBlogImage, isSupabaseStorageUrl } from '@/lib/supabase/storage'

// DB migrado supabase-js → Kysely; storage segue no Supabase (Fase 6).

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Get single blog post
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const post = await db.selectFrom('dual_blog_posts').selectAll()
      .where('id', '=', id).executeTakeFirst()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update blog post
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // If slug is being changed, check uniqueness
    if (body.slug) {
      const existing = await db.selectFrom('dual_blog_posts').select('id')
        .where('slug', '=', body.slug)
        .where('id', '!=', id)
        .executeTakeFirst()

      if (existing) {
        return NextResponse.json(
          { error: 'Já existe um post com este slug' },
          { status: 409 }
        )
      }
    }

    // Add updated_date
    body.updated_date = new Date()

    let updatedPost
    try {
      updatedPost = await db.updateTable('dual_blog_posts')
        .set(body as Updateable<Database['dual_blog_posts']>)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst()
    } catch (error) {
      console.error('Error updating blog post:', error)
      return NextResponse.json({ error: error instanceof Error ? error.message : 'update failed' }, { status: 500 })
    }

    if (!updatedPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ post: updatedPost })
  } catch (error) {
    console.error('Error in blog PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove blog post
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const blocked = await guardSupervisedAction(admin, 'Excluir post do blog')
    if (blocked) return blocked

    const { id } = await params

    // Get post to delete associated images
    const post = await db.selectFrom('dual_blog_posts')
      .select(['featured_image', 'car_review'])
      .where('id', '=', id)
      .executeTakeFirst()

    if (post) {
      // Delete featured image from storage
      if (post.featured_image && isSupabaseStorageUrl(post.featured_image)) {
        await deleteBlogImage(post.featured_image)
      }

      // Delete gallery images from storage
      const carReview = post.car_review as Record<string, unknown> | null
      if (carReview?.gallery_images && Array.isArray(carReview.gallery_images)) {
        for (const img of carReview.gallery_images) {
          const url = typeof img === 'string' ? img : (img as Record<string, string>)?.url
          if (url && isSupabaseStorageUrl(url)) {
            await deleteBlogImage(url)
          }
        }
      }
    }

    try {
      await db.deleteFrom('dual_blog_posts').where('id', '=', id).execute()
    } catch (error) {
      console.error('Error deleting blog post:', error)
      return NextResponse.json({ error: error instanceof Error ? error.message : 'delete failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in blog DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

