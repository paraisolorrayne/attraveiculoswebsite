/**
 * O saldo da conta de anúncios da Meta, como aparece na tela inicial e no
 * Marketing (14/11/2026). Só desenho: os dados chegam prontos de
 * src/lib/meta-ads.ts.
 *
 * Conta pré-paga mostra o crédito disponível; conta no cartão mostra o valor
 * em aberto. O gasto do mês aparece nas duas.
 */
import { AlertTriangle } from 'lucide-react'
import type { SaldoDaMeta } from '@/lib/meta-ads'

const dinheiro = (n: number, moeda: string) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: moeda || 'BRL' })

const hora = (iso: string) =>
	new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

function Medida({ valor, rotulo }: { valor: string; rotulo: string }) {
	return (
		<div className="min-w-0">
			<div className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{valor}</div>
			<div className="mt-1 text-sm text-foreground-secondary">{rotulo}</div>
		</div>
	)
}

export function SaldoMeta({ saldo }: { saldo: SaldoDaMeta }) {
	const m = saldo.moeda
	return (
		<div className="rounded-xl border border-border bg-background-card p-5">
			<div className="flex flex-wrap gap-x-10 gap-y-4">
				{saldo.disponivel !== null && <Medida valor={dinheiro(saldo.disponivel, m)} rotulo="Saldo disponível" />}
				{saldo.aPagar !== null && <Medida valor={dinheiro(saldo.aPagar, m)} rotulo="Em aberto para pagar" />}
				{saldo.gastoNoMes !== null && <Medida valor={dinheiro(saldo.gastoNoMes, m)} rotulo="Gasto neste mês" />}
				{saldo.restanteDoLimite !== null && <Medida valor={dinheiro(saldo.restanteDoLimite, m)} rotulo="Até o limite da conta" />}
			</div>
			{!saldo.ativa && (
				<p className="mt-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
					<AlertTriangle className="h-4 w-4 shrink-0" />
					A Meta informa que a conta de anúncios não está ativa. Vale conferir o pagamento no Gerenciador.
				</p>
			)}
			<p className="mt-4 text-xs text-foreground-secondary">
				{[saldo.nomeDaConta, saldo.prePaga && saldo.disponivel === null ? saldo.formaDePagamento : null, `lido às ${hora(saldo.lidoEm)}`]
					.filter(Boolean)
					.join(' · ')}
			</p>
		</div>
	)
}
