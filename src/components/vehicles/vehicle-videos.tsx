import Image from 'next/image'
import { Play, Youtube, Instagram } from 'lucide-react'
import { YouTubeVideo, formatDuration, searchVehicleVideos } from '@/lib/youtube'
import { joinNonEmpty } from '@/lib/vehicle-fallbacks'

interface VehicleVideosProps {
	videos: YouTubeVideo[]
	vehicleName: string
	brand: string
	model: string
}

const INSTAGRAM_HANDLE = 'attra.veiculos'

export function VehicleVideos({ videos, vehicleName, brand, model }: VehicleVideosProps) {
	const instagramSearchUrl = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`

	if (videos.length === 0) {
		return (
			<section className="bg-background-card border border-border rounded-xl p-6">
				<h2 className="text-xl font-semibold text-foreground mb-4">
					Veja na Attra
				</h2>
				<p className="text-foreground-secondary text-sm mb-5">
					Acompanhe os canais oficiais da Attra para vídeos de {vehicleName} e outros supercarros do nosso acervo.
				</p>
				<div className="flex flex-wrap gap-3">
					<a
						href="https://www.youtube.com/@attraveiculos"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600/10 border border-red-600/20 rounded-lg text-sm font-medium text-red-600 hover:bg-red-600/20 transition-colors"
					>
						<Youtube className="w-4 h-4" />
						YouTube Attra
					</a>
					<a
						href={instagramSearchUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 px-4 py-2.5 bg-pink-600/10 border border-pink-600/20 rounded-lg text-sm font-medium text-pink-600 hover:bg-pink-600/20 transition-colors"
					>
						<Instagram className="w-4 h-4" />
						Instagram Attra
					</a>
				</div>
			</section>
		)
	}

	return (
		<section className="bg-background-card border border-border rounded-xl p-6">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-semibold text-foreground">
					Vídeos do {vehicleName}
				</h2>
				<div className="flex gap-2">
					<a
						href={`https://www.youtube.com/@attraveiculos/search?query=${encodeURIComponent([brand, model].filter(Boolean).join(' '))}`}
						target="_blank"
						rel="noopener noreferrer"
						className="text-red-600 hover:text-red-700 transition-colors"
						title="Ver mais no YouTube"
					>
						<Youtube className="w-5 h-5" />
					</a>
					<a
						href={instagramSearchUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="text-pink-600 hover:text-pink-700 transition-colors"
						title="Ver no Instagram"
					>
						<Instagram className="w-5 h-5" />
					</a>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{videos.slice(0, 6).map((video) => (
					<a
						key={video.id}
						href={video.url}
						target="_blank"
						rel="noopener noreferrer"
						className="group block rounded-lg overflow-hidden border border-border hover:border-primary/40 transition-all"
					>
						<div className="relative aspect-video bg-background">
							{video.thumbnail ? (
								<Image
									src={video.thumbnail}
									alt={video.title}
									fill
									className="object-cover"
									sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
								/>
							) : (
								<div className="absolute inset-0 flex items-center justify-center bg-background-soft">
									<Play className="w-8 h-8 text-foreground-secondary" />
								</div>
							)}
							<div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
								<div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
									<Play className="w-5 h-5 text-white ml-0.5" />
								</div>
							</div>
							{video.durationSeconds > 0 && (
								<span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
									{formatDuration(video.durationSeconds)}
								</span>
							)}
							{video.isShort && (
								<span className="absolute top-2 left-2 bg-red-600/90 text-white text-xs px-1.5 py-0.5 rounded font-medium">
									Short
								</span>
							)}
						</div>
						<div className="p-3">
							<h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
								{video.title}
							</h3>
						</div>
					</a>
				))}
			</div>
		</section>
	)
}

interface VehicleVideosServerProps {
	brand: string
	model: string
}

export async function VehicleVideosServer({ brand, model }: VehicleVideosServerProps) {
	const videos = await searchVehicleVideos(brand, model)
	const vehicleName = joinNonEmpty([brand, model]) || 'Veículo'
	return <VehicleVideos videos={videos} vehicleName={vehicleName} brand={brand} model={model} />
}

export function VehicleVideosSkeleton() {
	return (
		<section className="bg-background-card border border-border rounded-xl p-6">
			<div className="h-6 w-48 bg-foreground-secondary/10 rounded animate-pulse mb-4" />
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className="rounded-lg border border-border overflow-hidden">
						<div className="aspect-video bg-foreground-secondary/10 animate-pulse" />
						<div className="p-3 space-y-2">
							<div className="h-4 bg-foreground-secondary/10 rounded animate-pulse" />
							<div className="h-4 bg-foreground-secondary/10 rounded animate-pulse w-3/4" />
						</div>
					</div>
				))}
			</div>
		</section>
	)
}
