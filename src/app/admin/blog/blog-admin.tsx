'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Search, Loader2, Check, X, RefreshCw,
  Pencil, FileText, Car, Eye, EyeOff, Upload, Image as ImageIcon,
  ChevronDown, ExternalLink,
} from 'lucide-react'

// =============================================
// TYPES
// =============================================

interface BlogPostItem {
  id: string
  post_type: 'educativo' | 'car_review'
  title: string
  slug: string
  excerpt: string
  content: string
  featured_image: string
  featured_image_alt: string
  author: { name: string; bio?: string; avatar?: string }
  published_date: string
  updated_date?: string
  reading_time: string
  is_published: boolean
  educativo?: {
    category?: string
    topic?: string
    seo_keyword?: string
  }
  car_review?: {
    brand?: string
    model?: string
    year?: number
    version?: string
    specs?: Record<string, string>
    gallery_images?: (string | { url: string; alt: string; caption?: string })[]
    availability?: { in_stock?: boolean; price?: string; stock_url?: string }
    faq?: { question: string; answer: string }[]
    highlights?: { text: string; category?: string }[]
    evaluation?: { summary?: string; highlights?: string[]; target_profile?: string }
  }
  seo?: {
    meta_title?: string
    meta_description?: string
    canonical_url?: string
    keywords?: string[]
  }
  source: 'admin' | 'wordpress'
}

type PostFormData = Omit<BlogPostItem, 'id' | 'source' | 'updated_date'>

const EMPTY_FORM: PostFormData = {
  post_type: 'educativo',
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  featured_image: '',
  featured_image_alt: '',
  author: { name: 'Attra Veículos' },
  published_date: new Date().toISOString().split('T')[0],
  reading_time: '5 min',
  is_published: false,
  educativo: { category: 'Curadoria', topic: '', seo_keyword: '' },
  car_review: undefined,
  seo: { meta_title: '', meta_description: '', keywords: [] },
}

const EMPTY_CAR_REVIEW = {
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  version: '',
  specs: {
    engine: '', power: '', torque: '', acceleration: '',
    top_speed: '', transmission: '',
  },
  gallery_images: [] as string[],
  availability: { in_stock: true, price: '', stock_url: '' },
  faq: [] as { question: string; answer: string }[],
  highlights: [] as { text: string; category?: string }[],
  evaluation: { summary: '', highlights: [] as string[], target_profile: '' },
}

// =============================================
// HELPER: Generate slug from title
// =============================================

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// =============================================
// MAIN COMPONENT
// =============================================

export function BlogAdmin() {
  // State
  const [posts, setPosts] = useState<BlogPostItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'educativo' | 'car_review'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all')
  const [filterSource, setFilterSource] = useState<'all' | 'admin' | 'wordpress'>('all')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingPost, setEditingPost] = useState<BlogPostItem | null>(null)
  const [formData, setFormData] = useState<PostFormData>({ ...EMPTY_FORM })
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'meta' | 'type_fields'>('content')

  const router = useRouter()

  // =============================================
  // DATA FETCHING
  // =============================================

  const fetchPosts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType !== 'all') params.set('type', filterType)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterSource !== 'all') params.set('source', filterSource)
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/admin/blog?${params}`)
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filterType, filterStatus, filterSource, searchQuery, router])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // =============================================
  // IMAGE UPLOAD
  // =============================================

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/admin/blog/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }
      const data = await res.json()
      setFormData(prev => ({
        ...prev,
        featured_image: data.url,
        featured_image_alt: prev.featured_image_alt || prev.title,
      }))
    } catch (error) {
      console.error('Upload error:', error)
      alert(error instanceof Error ? error.message : 'Erro no upload')
    } finally {
      setIsUploading(false)
    }
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      const uploadedUrls: string[] = []
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/admin/blog/upload', { method: 'POST', body: fd })
        if (!res.ok) continue
        const data = await res.json()
        uploadedUrls.push(data.url)
      }
      setFormData(prev => ({
        ...prev,
        car_review: {
          ...EMPTY_CAR_REVIEW,
          ...prev.car_review,
          gallery_images: [
            ...((prev.car_review?.gallery_images as string[]) || []),
            ...uploadedUrls,
          ],
        },
      }))
    } catch (error) {
      console.error('Gallery upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  // =============================================
  // CRUD OPERATIONS
  // =============================================

  const openCreateModal = () => {
    setEditingPost(null)
    setFormData({ ...EMPTY_FORM })
    setActiveTab('content')
    setShowModal(true)
  }

  const openEditModal = (post: BlogPostItem) => {
    setEditingPost(post)
    setFormData({
      post_type: post.post_type,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      featured_image: post.featured_image,
      featured_image_alt: post.featured_image_alt,
      author: post.author || { name: 'Attra Veículos' },
      published_date: post.published_date?.split('T')[0] || '',
      reading_time: post.reading_time || '5 min',
      is_published: post.is_published,
      educativo: post.educativo || { category: 'Curadoria', topic: '', seo_keyword: '' },
      car_review: post.car_review || undefined,
      seo: post.seo || { meta_title: '', meta_description: '', keywords: [] },
    })
    setActiveTab('content')
    setShowModal(true)
  }

  const savePost = async (publish: boolean) => {
    setIsSaving(true)
    try {
      const payload = {
        ...formData,
        is_published: publish,
        published_date: formData.published_date
          ? new Date(formData.published_date).toISOString()
          : new Date().toISOString(),
        educativo: formData.post_type === 'educativo' ? formData.educativo : null,
        car_review: formData.post_type === 'car_review' ? formData.car_review : null,
      }

      const url = editingPost
        ? `/api/admin/blog/${editingPost.id}`
        : '/api/admin/blog'

      const res = await fetch(url, {
        method: editingPost ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar')
      }

      setShowModal(false)
      await fetchPosts()
    } catch (error) {
      console.error('Save error:', error)
      alert(error instanceof Error ? error.message : 'Erro ao salvar post')
    } finally {
      setIsSaving(false)
    }
  }

  const deletePost = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este post?')) return

    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      await fetchPosts()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Erro ao excluir post')
    }
  }

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: !editingPost ? generateSlug(title) : prev.slug,
      seo: { ...prev.seo, meta_title: prev.seo?.meta_title || title },
    }))
  }

  // =============================================
  // RENDER
  // =============================================

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciar Blog</h1>
          <p className="text-foreground-secondary mt-1">
            {posts.length} post(s) encontrado(s)
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchPosts}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-background-soft transition-colors text-foreground"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Post
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
          <input
            type="text"
            placeholder="Buscar por título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background-card border border-border rounded-lg text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Type filter */}
        <div className="relative">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="appearance-none pl-3 pr-8 py-2 bg-background-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">Todos os tipos</option>
            <option value="educativo">Educativo</option>
            <option value="car_review">Car Review</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="appearance-none pl-3 pr-8 py-2 bg-background-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">Todos os status</option>
            <option value="published">Publicado</option>
            <option value="draft">Rascunho</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary pointer-events-none" />
        </div>

        {/* Source filter */}
        <div className="relative">
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as typeof filterSource)}
            className="appearance-none pl-3 pr-8 py-2 bg-background-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">Todas as fontes</option>
            <option value="admin">Admin</option>
            <option value="wordpress">WordPress</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary pointer-events-none" />
        </div>
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 bg-background-card border border-border rounded-2xl">
          <FileText className="w-12 h-12 text-foreground-secondary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Nenhum post encontrado
          </h2>
          <p className="text-foreground-secondary mb-6">
            Crie seu primeiro post ou ajuste os filtros
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Criar Post
          </button>
        </div>
      ) : (
        <div className="bg-background-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-background-soft">
                <th className="text-left px-4 py-3 text-xs font-medium text-foreground-secondary uppercase tracking-wider">Título</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-foreground-secondary uppercase tracking-wider hidden md:table-cell">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-foreground-secondary uppercase tracking-wider hidden lg:table-cell">Data</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-foreground-secondary uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-foreground-secondary uppercase tracking-wider hidden lg:table-cell">Fonte</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-foreground-secondary uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {posts.map((post) => (
                <tr key={`${post.source}-${post.id}`} className="hover:bg-background-soft/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {post.featured_image && !post.featured_image.includes('default-cover') ? (
                        <img
                          src={post.featured_image}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {post.post_type === 'car_review' ? (
                            <Car className="w-5 h-5 text-primary" />
                          ) : (
                            <FileText className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate max-w-[300px]">{post.title}</p>
                        <p className="text-xs text-foreground-secondary truncate max-w-[300px]">/{post.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      post.post_type === 'car_review'
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {post.post_type === 'car_review' ? <Car className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                      {post.post_type === 'car_review' ? 'Review' : 'Educativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-foreground-secondary">
                      {new Date(post.published_date).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      post.is_published
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {post.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {post.is_published ? 'Publicado' : 'Rascunho'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      post.source === 'wordpress'
                        ? 'bg-purple-500/10 text-purple-500'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {post.source === 'wordpress' ? 'WordPress' : 'Admin'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        className="p-2 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-background-soft transition-colors"
                        title="Ver post"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      {post.source === 'admin' && (
                        <>
                          <button
                            onClick={() => openEditModal(post)}
                            className="p-2 rounded-lg text-blue-500 hover:bg-blue-500/10 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deletePost(post.id)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =============================================
          CREATE/EDIT MODAL
          ============================================= */}
      {showModal && (
        <PostFormModal
          formData={formData}
          setFormData={setFormData}
          editingPost={editingPost}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSaving={isSaving}
          isUploading={isUploading}
          onClose={() => setShowModal(false)}
          onSave={savePost}
          onTitleChange={handleTitleChange}
          onImageUpload={handleImageUpload}
          onGalleryUpload={handleGalleryUpload}
        />
      )}
    </div>
  )
}

// =============================================
// FORM MODAL COMPONENT
// =============================================

interface PostFormModalProps {
  formData: PostFormData
  setFormData: React.Dispatch<React.SetStateAction<PostFormData>>
  editingPost: BlogPostItem | null
  activeTab: 'content' | 'meta' | 'type_fields'
  setActiveTab: (tab: 'content' | 'meta' | 'type_fields') => void
  isSaving: boolean
  isUploading: boolean
  onClose: () => void
  onSave: (publish: boolean) => void
  onTitleChange: (title: string) => void
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onGalleryUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function PostFormModal({
  formData, setFormData, editingPost, activeTab, setActiveTab,
  isSaving, isUploading, onClose, onSave, onTitleChange, onImageUpload, onGalleryUpload,
}: PostFormModalProps) {
  const tabs = [
    { id: 'content' as const, label: 'Conteúdo' },
    { id: 'type_fields' as const, label: formData.post_type === 'car_review' ? 'Dados do Veículo' : 'Dados Educativo' },
    { id: 'meta' as const, label: 'SEO & Meta' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-background-card border border-border rounded-2xl w-full max-w-4xl my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            {editingPost ? 'Editar Post' : 'Novo Post'}
          </h2>
          <button onClick={onClose} className="text-foreground-secondary hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground-secondary hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'content' && (
            <ContentTab
              formData={formData}
              setFormData={setFormData}
              isUploading={isUploading}
              onTitleChange={onTitleChange}
              onImageUpload={onImageUpload}
            />
          )}
          {activeTab === 'type_fields' && (
            formData.post_type === 'car_review' ? (
              <CarReviewTab
                formData={formData}
                setFormData={setFormData}
                isUploading={isUploading}
                onGalleryUpload={onGalleryUpload}
              />
            ) : (
              <EducativoTab formData={formData} setFormData={setFormData} />
            )
          )}
          {activeTab === 'meta' && (
            <SeoTab formData={formData} setFormData={setFormData} />
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-foreground-secondary hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => onSave(false)}
              disabled={isSaving || !formData.title || !formData.slug}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-background-soft disabled:opacity-50 transition-colors"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <EyeOff className="w-4 h-4" />}
              Salvar Rascunho
            </button>
            <button
              onClick={() => onSave(true)}
              disabled={isSaving || !formData.title || !formData.slug}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Publicar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================
// CONTENT TAB
// =============================================

function ContentTab({
  formData, setFormData, isUploading, onTitleChange, onImageUpload,
}: {
  formData: PostFormData
  setFormData: React.Dispatch<React.SetStateAction<PostFormData>>
  isUploading: boolean
  onTitleChange: (title: string) => void
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="space-y-6">
      {/* Post Type */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Tipo de Post</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setFormData(prev => ({
              ...prev,
              post_type: 'educativo',
              educativo: prev.educativo || { category: 'Curadoria', topic: '', seo_keyword: '' },
              car_review: undefined,
            }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              formData.post_type === 'educativo'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-foreground-secondary hover:border-foreground'
            }`}
          >
            <FileText className="w-4 h-4" />
            Educativo
          </button>
          <button
            type="button"
            onClick={() => setFormData(prev => ({
              ...prev,
              post_type: 'car_review',
              car_review: prev.car_review || { ...EMPTY_CAR_REVIEW },
              educativo: undefined,
            }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              formData.post_type === 'car_review'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-foreground-secondary hover:border-foreground'
            }`}
          >
            <Car className="w-4 h-4" />
            Car Review
          </button>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Título *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Título do post"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Slug *</label>
        <input
          type="text"
          value={formData.slug}
          onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="slug-do-post"
        />
      </div>

      {/* Excerpt */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Resumo / Excerpt</label>
        <textarea
          value={formData.excerpt}
          onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
          rows={3}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
          placeholder="Breve resumo do post..."
        />
      </div>

      {/* Content (HTML) */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Conteúdo (HTML)
        </label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
          rows={12}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
          placeholder="<h2>Título da seção</h2>\n<p>Conteúdo do post...</p>"
        />
      </div>

      {/* Featured Image */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Imagem Destacada</label>
        {formData.featured_image ? (
          <div className="relative group">
            <img
              src={formData.featured_image}
              alt={formData.featured_image_alt}
              className="w-full h-48 object-cover rounded-lg"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <button
              onClick={() => setFormData(prev => ({ ...prev, featured_image: '' }))}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
            {isUploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-foreground-secondary mb-2" />
                <span className="text-sm text-foreground-secondary">Clique para fazer upload</span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={onImageUpload}
              className="hidden"
            />
          </label>
        )}
        <input
          type="text"
          value={formData.featured_image_alt}
          onChange={(e) => setFormData(prev => ({ ...prev, featured_image_alt: e.target.value }))}
          className="w-full mt-2 px-4 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Texto alternativo da imagem"
        />
      </div>

      {/* Published Date & Reading Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Data de Publicação</label>
          <input
            type="date"
            value={formData.published_date?.split('T')[0] || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, published_date: e.target.value }))}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Tempo de Leitura</label>
          <input
            type="text"
            value={formData.reading_time}
            onChange={(e) => setFormData(prev => ({ ...prev, reading_time: e.target.value }))}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="5 min"
          />
        </div>
      </div>

      {/* Author */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Autor</label>
        <input
          type="text"
          value={formData.author?.name || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            author: { ...prev.author, name: e.target.value },
          }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Nome do autor"
        />
      </div>
    </div>
  )
}

// =============================================
// EDUCATIVO TAB
// =============================================

function EducativoTab({
  formData, setFormData,
}: {
  formData: PostFormData
  setFormData: React.Dispatch<React.SetStateAction<PostFormData>>
}) {
  const educativo = formData.educativo || { category: 'Curadoria', topic: '', seo_keyword: '' }

  const updateEducativo = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      educativo: { ...educativo, [field]: value },
    }))
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Categoria</label>
        <select
          value={educativo.category || 'Curadoria'}
          onChange={(e) => updateEducativo('category', e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="Curadoria">Curadoria</option>
          <option value="Mercado">Mercado</option>
          <option value="Dicas">Dicas</option>
          <option value="Lifestyle">Lifestyle</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Tópico</label>
        <input
          type="text"
          value={educativo.topic || ''}
          onChange={(e) => updateEducativo('topic', e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Ex: Mercado de luxo, Manutenção, Investimento"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Palavra-chave SEO</label>
        <input
          type="text"
          value={educativo.seo_keyword || ''}
          onChange={(e) => updateEducativo('seo_keyword', e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Ex: carros de luxo usados"
        />
      </div>
    </div>
  )
}

// =============================================
// CAR REVIEW TAB
// =============================================

function CarReviewTab({
  formData, setFormData, isUploading, onGalleryUpload,
}: {
  formData: PostFormData
  setFormData: React.Dispatch<React.SetStateAction<PostFormData>>
  isUploading: boolean
  onGalleryUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const cr = formData.car_review || { ...EMPTY_CAR_REVIEW }

  const updateCR = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      car_review: { ...EMPTY_CAR_REVIEW, ...prev.car_review, [field]: value },
    }))
  }

  const updateSpec = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      car_review: {
        ...EMPTY_CAR_REVIEW,
        ...prev.car_review,
        specs: { ...EMPTY_CAR_REVIEW.specs, ...prev.car_review?.specs, [field]: value },
      },
    }))
  }

  const removeGalleryImage = (index: number) => {
    const imgs = [...((cr.gallery_images as string[]) || [])]
    imgs.splice(index, 1)
    updateCR('gallery_images', imgs)
  }

  return (
    <div className="space-y-6">
      {/* Vehicle Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Marca *</label>
          <input
            type="text"
            value={cr.brand || ''}
            onChange={(e) => updateCR('brand', e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Ex: Lamborghini"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Modelo *</label>
          <input
            type="text"
            value={cr.model || ''}
            onChange={(e) => updateCR('model', e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Ex: Huracán"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Ano</label>
          <input
            type="number"
            value={cr.year || new Date().getFullYear()}
            onChange={(e) => updateCR('year', parseInt(e.target.value))}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Versão</label>
          <input
            type="text"
            value={cr.version || ''}
            onChange={(e) => updateCR('version', e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Ex: LP640-2"
          />
        </div>
      </div>

      {/* Specs */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Especificações</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'engine', label: 'Motor', placeholder: 'Ex: V10 5.2L' },
            { key: 'power', label: 'Potência', placeholder: 'Ex: 640 cv' },
            { key: 'torque', label: 'Torque', placeholder: 'Ex: 600 Nm' },
            { key: 'acceleration', label: '0-100 km/h', placeholder: 'Ex: 2.9s' },
            { key: 'top_speed', label: 'Vel. Máxima', placeholder: 'Ex: 325 km/h' },
            { key: 'transmission', label: 'Câmbio', placeholder: 'Ex: Automático 7 marchas' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">{label}</label>
              <input
                type="text"
                value={(cr.specs as Record<string, string>)?.[key] || ''}
                onChange={(e) => updateSpec(key, e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Gallery Images */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Galeria de Fotos</h3>
        <div className="grid grid-cols-4 gap-3 mb-3">
          {((cr.gallery_images as string[]) || []).map((img, idx) => (
            <div key={idx} className="relative group aspect-video">
              <img src={typeof img === 'string' ? img : (img as { url: string }).url} alt="" className="w-full h-full object-cover rounded-lg" />
              <button
                onClick={() => removeGalleryImage(idx)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <label className="flex items-center justify-center h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <div className="flex items-center gap-2 text-foreground-secondary">
              <ImageIcon className="w-5 h-5" />
              <span className="text-sm">Adicionar fotos</span>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            onChange={onGalleryUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Availability */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Disponibilidade</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={cr.availability?.in_stock ?? true}
              onChange={(e) => updateCR('availability', {
                ...cr.availability,
                in_stock: e.target.checked,
              })}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <label className="text-sm text-foreground">Em estoque</label>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-secondary mb-1">Preço</label>
            <input
              type="text"
              value={cr.availability?.price || ''}
              onChange={(e) => updateCR('availability', {
                ...cr.availability,
                price: e.target.value,
              })}
              className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ex: Sob consulta"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================
// SEO TAB
// =============================================

function SeoTab({
  formData, setFormData,
}: {
  formData: PostFormData
  setFormData: React.Dispatch<React.SetStateAction<PostFormData>>
}) {
  const seo = formData.seo || { meta_title: '', meta_description: '', keywords: [] }

  const updateSeo = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      seo: { ...prev.seo, [field]: value },
    }))
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Meta Title</label>
        <input
          type="text"
          value={seo.meta_title || ''}
          onChange={(e) => updateSeo('meta_title', e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Título para SEO"
        />
        <p className="text-xs text-foreground-secondary mt-1">
          {(seo.meta_title || '').length}/60 caracteres
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Meta Description</label>
        <textarea
          value={seo.meta_description || ''}
          onChange={(e) => updateSeo('meta_description', e.target.value)}
          rows={3}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
          placeholder="Descrição para SEO"
        />
        <p className="text-xs text-foreground-secondary mt-1">
          {(seo.meta_description || '').length}/160 caracteres
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Canonical URL</label>
        <input
          type="text"
          value={seo.canonical_url || ''}
          onChange={(e) => updateSeo('canonical_url', e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="https://attra.com.br/blog/..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Keywords (separadas por vírgula)</label>
        <input
          type="text"
          value={(seo.keywords || []).join(', ')}
          onChange={(e) => updateSeo('keywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="carro, luxo, review"
        />
      </div>
    </div>
  )
}

