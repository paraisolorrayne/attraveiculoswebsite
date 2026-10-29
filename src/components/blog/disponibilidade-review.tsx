import Link from 'next/link'
import { ArrowRight, CheckCircle, Clock, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CinematicVehicleCard } from '@/components/vehicles/cinematic-vehicle-card'
import type { SituacaoDoReview } from '@/lib/blog-disponibilidade'
import type { Vehicle } from '@/types'
import { formatPrice } from '@/lib/utils'
import { AVISO_DE_PRECO } from '@/lib/seo/estoque-do-modelo'

interface DisponibilidadeReviewProps {
	situacao: SituacaoDoReview
	brand?: string
	model?: string
	/** Do mais parecido ao menos; só aparece quando o carro do review não está à venda. */
	semelhantes: Vehicle[]
}

/**
 * Bloco "Disponibilidade na Attra" do review, montado no servidor com o estoque
 * do momento (ver src/lib/blog-disponibilidade.ts). O `id` é o destino dos
 * links do texto que apontavam para a ficha de um carro já vendido.
 */
export function DisponibilidadeReview({ situacao, brand, model, semelhantes }: DisponibilidadeReviewProps) {
	const carro = [brand, model].filter(Boolean).join(' ')
	const estoqueDaMarca = brand ? `/veiculos?marca=${brand.toLowerCase()}` : '/veiculos'

	if (situacao.tipo === 'a_venda') {
		return (
			<div id="disponibilidade" className="mt-12 p-6 lg:p-8 rounded-2xl border-2 border-primary/30 bg-primary/5 scroll-mt-28">
				<div className="flex items-start justify-between flex-wrap gap-6">
					<div>
						<div className="flex items-center gap-2 mb-3">
							<CheckCircle className="w-6 h-6 text-green-500" />
							<span className="text-lg font-bold text-green-600 dark:text-green-400">
								Disponível na Attra Veículos
							</span>
						</div>
						<p className="text-sm text-foreground-secondary">
							Este exemplar está à venda na Attra Veículos, em Uberlândia-MG.
						</p>
						{/* Preço do estoque de agora, não do dia em que o post foi escrito. */}
						{situacao.veiculo.price > 0 && (
							<>
								<p className="mt-3 text-2xl font-bold text-foreground">{formatPrice(situacao.veiculo.price)}*</p>
								<p className="mt-1 text-xs text-foreground-secondary">*{AVISO_DE_PRECO}</p>
							</>
						)}
					</div>
					<Button asChild size="lg" className="min-h-[52px]">
						<Link href={`/veiculo/${situacao.veiculo.slug}`}>
							Ver Detalhes do Veículo
							<ArrowRight className="w-5 h-5 ml-2" />
						</Link>
					</Button>
				</div>
			</div>
		)
	}

	const vendido = situacao.tipo === 'vendido'

	return (
		<div id="disponibilidade" className="mt-12 p-6 lg:p-8 rounded-2xl border-2 border-border bg-background-soft scroll-mt-28">
			<div className="flex items-center gap-2 mb-3">
				<Clock className="w-6 h-6 text-foreground-secondary" />
				<span className="text-lg font-bold text-foreground">
					{vendido ? 'Este exemplar já foi vendido' : `Procurando um ${carro}?`}
				</span>
			</div>
			<p className="text-foreground-secondary">
				{vendido && `O ${carro} deste review saiu do estoque da Attra. `}
				{semelhantes.length > 0
					? 'Estes são os mais próximos disponíveis agora.'
					: 'A Attra encontra o exemplar certo para você.'}
			</p>

			{semelhantes.length > 0 && (
				<div className="mt-6 grid gap-6 sm:grid-cols-2">
					{semelhantes.map(veiculo => (
						<CinematicVehicleCard key={veiculo.id} vehicle={veiculo} layout="vertical" />
					))}
				</div>
			)}

			<div className="mt-6 flex flex-col sm:flex-row gap-3">
				<Button asChild size="lg" className="min-h-[52px]">
					<Link href={estoqueDaMarca}>
						<Search className="w-5 h-5 mr-2" />
						{brand ? `Ver estoque ${brand}` : 'Ver estoque completo'}
					</Link>
				</Button>
				<Button asChild variant="outline" size="lg" className="min-h-[52px]">
					<Link href="/solicitar-veiculo">
						{model ? `Encomendar um ${model}` : 'Solicitar um veículo'}
						<ArrowRight className="w-5 h-5 ml-2" />
					</Link>
				</Button>
			</div>
		</div>
	)
}
