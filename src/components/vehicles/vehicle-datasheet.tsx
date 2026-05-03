import {
	Gauge, Zap, RotateCw, Fuel, Weight, Ruler,
	Car, Shield, ArrowUpRight, Cog, CircleGauge,
	BookOpen, Star,
} from 'lucide-react'
import type { VehicleDatasheet } from '@/lib/vehicle-datasheet'
import type { Vehicle } from '@/types'

interface VehicleDatasheetSectionProps {
	datasheet: VehicleDatasheet
	vehicle: Vehicle
}

interface SpecItem {
	icon: typeof Gauge
	label: string
	value: string
}

export function VehicleDatasheetSection({ datasheet, vehicle }: VehicleDatasheetSectionProps) {
	const primarySpecs: SpecItem[] = [
		{ icon: Cog, label: 'Motor', value: vehicle.engine || datasheet.engine },
		{ icon: CircleGauge, label: 'Cilindrada', value: datasheet.displacement },
		{ icon: Zap, label: 'Potência', value: vehicle.horsepower ? `${vehicle.horsepower} cv` : datasheet.power },
		{ icon: RotateCw, label: 'Torque', value: vehicle.torque ? `${vehicle.torque} Nm` : datasheet.torque },
		{ icon: Gauge, label: '0–100 km/h', value: vehicle.acceleration ? `${vehicle.acceleration} s` : datasheet.acceleration.replace(/\s*\(0.100\s*km\/h\)/, '') },
		{ icon: ArrowUpRight, label: 'Velocidade máxima', value: vehicle.top_speed ? `${vehicle.top_speed} km/h` : datasheet.topSpeed },
		{ icon: Car, label: 'Transmissão', value: vehicle.transmission || datasheet.transmission },
		{ icon: Shield, label: 'Tração', value: datasheet.drivetrain },
	].filter(s => s.value)

	const secondarySpecs: SpecItem[] = [
		{ icon: Weight, label: 'Peso', value: datasheet.weight },
		{ icon: Fuel, label: 'Consumo', value: datasheet.fuelConsumption || '' },
		{ icon: Fuel, label: 'Tanque', value: datasheet.fuelTankCapacity || '' },
		{ icon: Ruler, label: 'Comprimento', value: datasheet.length || '' },
		{ icon: Ruler, label: 'Largura', value: datasheet.width || '' },
		{ icon: Ruler, label: 'Altura', value: datasheet.height || '' },
		{ icon: Ruler, label: 'Entre-eixos', value: datasheet.wheelbase || '' },
	].filter(s => s.value)

	const chassisSpecs: SpecItem[] = [
		{ icon: Car, label: 'Pneus', value: datasheet.tires || '' },
		{ icon: Shield, label: 'Freios', value: datasheet.brakes || '' },
		{ icon: Car, label: 'Porta-malas', value: datasheet.trunkCapacity || '' },
		{ icon: Car, label: 'Lugares', value: datasheet.seatingCapacity || '' },
	].filter(s => s.value)

	return (
		<section className="bg-background-card border border-border rounded-xl overflow-hidden">
			<div className="p-6 border-b border-border">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
						<BookOpen className="w-5 h-5 text-primary" />
					</div>
					<div>
						<h2 className="text-xl font-semibold text-foreground">
							Ficha Técnica Completa
						</h2>
						<p className="text-sm text-foreground-secondary">
							{datasheet.brand} {datasheet.model} — dados oficiais do fabricante
						</p>
					</div>
				</div>
			</div>

			{/* Performance & Powertrain */}
			<div className="p-6 border-b border-border">
				<h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
					Motor e Performance
				</h3>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					{primarySpecs.map((spec) => (
						<div key={spec.label} className="p-3 bg-background rounded-lg">
							<div className="flex items-center gap-2 mb-1">
								<spec.icon className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
								<span className="text-xs text-foreground-secondary">{spec.label}</span>
							</div>
							<p className="text-sm font-medium text-foreground">{spec.value}</p>
						</div>
					))}
				</div>
			</div>

			{/* Dimensions & Weight */}
			{secondarySpecs.length > 0 && (
				<div className="p-6 border-b border-border">
					<h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
						Dimensões e Consumo
					</h3>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
						{secondarySpecs.map((spec) => (
							<div key={spec.label} className="p-3 bg-background rounded-lg">
								<div className="flex items-center gap-2 mb-1">
									<spec.icon className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
									<span className="text-xs text-foreground-secondary">{spec.label}</span>
								</div>
								<p className="text-sm font-medium text-foreground">{spec.value}</p>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Chassis */}
			{chassisSpecs.length > 0 && (
				<div className="p-6 border-b border-border">
					<h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
						Chassis e Rodagem
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{chassisSpecs.map((spec) => (
							<div key={spec.label} className="p-3 bg-background rounded-lg">
								<div className="flex items-center gap-2 mb-1">
									<spec.icon className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
									<span className="text-xs text-foreground-secondary">{spec.label}</span>
								</div>
								<p className="text-sm font-medium text-foreground">{spec.value}</p>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Highlights */}
			{datasheet.highlights.length > 0 && (
				<div className="p-6">
					<h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
						Destaques do modelo
					</h3>
					<ul className="space-y-2">
						{datasheet.highlights.map((h, i) => (
							<li key={i} className="flex items-start gap-3 text-sm text-foreground-secondary">
								<Star className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
								<span>{h}</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</section>
	)
}
