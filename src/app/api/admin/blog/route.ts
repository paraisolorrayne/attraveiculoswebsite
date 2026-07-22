import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { importedBlogPosts } from '@/lib/imported-blog-posts'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

// GET - List all blog posts (Supabase + imported WordPress)
export async function GET(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || ''
    const source = searchParams.get('source') || 'all' // 'all', 'admin', 'wordpress'

    // Fetch DB posts
    const dbPosts = await db.selectFrom('dual_blog_posts').selectAll()
      .orderBy('published_date', 'desc')
      .execute()
      .catch((error) => { console.error('Error fetching blog posts:', error); return [] })

    // Transform DB posts to match DualBlogPost interface
    const supabasePosts = (dbPosts as unknown as Record<string, unknown>[]).map((p) => ({
      id: p.id as string,
      post_type: p.post_type as string,
      title: p.title as string,
      slug: p.slug as string,
      excerpt: p.excerpt as string,
      content: p.content as string,
      featured_image: p.featured_image as string,
      featured_image_alt: p.featured_image_alt as string,
      author: p.author as Record<string, unknown>,
      published_date: p.published_date as string,
      updated_date: p.updated_date as string | undefined,
      reading_time: p.reading_time as string,
      is_published: p.is_published as boolean,
      educativo: p.educativo as Record<string, unknown> | undefined,
      car_review: p.car_review as Record<string, unknown> | undefined,
      seo: p.seo as Record<string, unknown>,
      source: 'admin' as const,
    }))

    // Transform imported posts
    const wpPosts = importedBlogPosts.map(p => ({
      ...p,
      source: 'wordpress' as const,
    }))

    // Combine all posts
    let allPosts = [...supabasePosts, ...wpPosts]

    // Apply filters
    if (type !== 'all') {
      allPosts = allPosts.filter(p => p.post_type === type)
    }

    if (status !== 'all') {
      const isPublished = status === 'published'
      allPosts = allPosts.filter(p => p.is_published === isPublished)
    }

    if (source !== 'all') {
      allPosts = allPosts.filter(p => p.source === source)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      allPosts = allPosts.filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        p.slug.toLowerCase().includes(searchLower)
      )
    }

    // Sort by date
    allPosts.sort((a, b) =>
      new Date(b.published_date).getTime() - new Date(a.published_date).getTime()
    )

    return NextResponse.json({ posts: allPosts, total: allPosts.length })
  } catch (error) {
    console.error('Error in blog GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new blog post
export async function POST(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      post_type, title, slug, excerpt, content,
      featured_image, featured_image_alt,
      author, published_date, reading_time,
      is_published, educativo, car_review, seo,
    } = body

    if (!post_type || !title || !slug) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: post_type, title, slug' },
        { status: 400 }
      )
    }

    // Check slug uniqueness
    const existing = await db.selectFrom('dual_blog_posts').select('id')
      .where('slug', '=', slug).executeTakeFirst()

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um post com este slug' },
        { status: 409 }
      )
    }

    // Also check against imported posts
    const importedSlugExists = importedBlogPosts.some(p => p.slug === slug)
    if (importedSlugExists) {
      return NextResponse.json(
        { error: 'Já existe um post importado com este slug' },
        { status: 409 }
      )
    }

    let newPost
    try {
      newPost = await db.insertInto('dual_blog_posts')
        .values({
          post_type,
          title,
          slug,
          excerpt: excerpt || '',
          content: content || '',
          featured_image: featured_image || '',
          featured_image_alt: featured_image_alt || '',
          author: author || { name: 'Attra Veículos' },
          published_date: published_date || new Date(),
          reading_time: reading_time || '5 min',
          is_published: is_published || false,
          educativo: post_type === 'educativo' ? educativo : null,
          car_review: post_type === 'car_review' ? car_review : null,
          seo: seo || { meta_title: title, meta_description: excerpt || '', keywords: [] },
          source: 'admin',
        })
        .returningAll()
        .executeTakeFirstOrThrow()
    } catch (error) {
      console.error('Error creating blog post:', error)
      return NextResponse.json({ error: error instanceof Error ? error.message : 'insert failed' }, { status: 500 })
    }

    return NextResponse.json({ post: newPost }, { status: 201 })
  } catch (error) {
    console.error('Error in blog POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

