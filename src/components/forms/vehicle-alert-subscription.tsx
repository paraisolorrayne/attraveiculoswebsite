'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Bell, CheckCircle } from 'lucide-react'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  brands: z.array(z.string()).min(1, 'Selecione pelo menos uma marca'),
})

type FormData = z.infer<typeof schema>

const luxuryBrands = [
  { id: 'ferrari', label: 'Ferrari', logo: '🔴' },
  { id: 'porsche', label: 'Porsche', logo: '🟡' },
  { id: 'lamborghini', label: 'Lamborghini', logo: '🟢' },
  { id: 'mclaren', label: 'McLaren', logo: '🟠' },
  { id: 'bentley', label: 'Bentley', logo: '⚫' },
  { id: 'rollsroyce', label: 'Rolls-Royce', logo: '🔵' },
]

export function VehicleAlertSubscription() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { brands: [] },
  })

  const toggleBrand = (brandId: string) => {
    const newBrands = selectedBrands.includes(brandId)
      ? selectedBrands.filter(b => b !== brandId)
      : [...selectedBrands, brandId]
    setSelectedBrands(newBrands)
    setValue('brands', newBrands)
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const brandNames = data.brands.map(id => luxuryBrands.find(b => b.id === id)?.label).join(', ')

      // Notifica a loja por email + Avisa (sem telefone não vira lead Fykos)
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Alerta de veículos (site)',
          email: data.email,
          message: `Quer ser avisado sobre: ${brandNames}`,
          formType: 'vehicle_alert',
          sourcePage: '/veiculos',
        }),
      })

      setIsSuccess(true)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="bg-background-card border border-border rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">Alertas Ativados!</h3>
        <p className="text-foreground-secondary text-sm">
          Você receberá notificações quando novos veículos das marcas selecionadas chegarem.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-background-card border border-primary/20 rounded-xl overflow-hidden">
      <div className="bg-primary/5 border-b border-primary/10 px-5 py-4 flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Receba Alertas de Novos Modelos</h3>
          <p className="text-sm text-foreground-secondary">Seja o primeiro a saber quando chegarem</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Selecione as marcas de interesse
          </label>
          <div className="grid grid-cols-3 gap-2">
            {luxuryBrands.map((brand) => (
              <button
                key={brand.id}
                type="button"
                onClick={() => toggleBrand(brand.id)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-sm ${
                  selectedBrands.includes(brand.id)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background hover:border-primary/50 text-foreground-secondary'
                }`}
              >
                <span>{brand.logo}</span>
                <span className="font-medium">{brand.label}</span>
              </button>
            ))}
          </div>
          <input type="hidden" {...register('brands')} />
          {errors.brands && (
            <p className="mt-1.5 text-sm text-primary">{errors.brands.message}</p>
          )}
        </div>

        <div>
          <Input 
            {...register('email')} 
            type="email" 
            placeholder="Seu melhor e-mail" 
            error={errors.email?.message}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ativando...</>
          ) : (
            <><Bell className="w-4 h-4 mr-2" /> Ativar Alertas</>
          )}
        </Button>

        <p className="text-xs text-foreground-secondary text-center">
          Prometemos enviar apenas novidades relevantes. Sem spam.
        </p>
      </form>
    </div>
  )
}

