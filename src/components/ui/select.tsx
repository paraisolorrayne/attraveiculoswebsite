import { cn } from '@/lib/utils'
import { SelectHTMLAttributes, forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, options, placeholder, ...props }, ref) => {
    // Sem valor inicial, o navegador pula a opção desabilitada e marca a
    // primeira de verdade: o "Selecione" nunca aparecia e o formulário da home
    // já vinha com "Até R$ 300 mil" (29/10/2026). Com o placeholder, ele é o inicial.
    const inicial =
      placeholder && props.value === undefined && props.defaultValue === undefined ? { defaultValue: '' } : {}
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            'w-full h-10 px-3 py-2 pr-10 bg-background border border-border rounded-lg text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors cursor-pointer',
            error && 'border-primary ring-1 ring-primary',
            className
          )}
          {...inicial}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary pointer-events-none" />
        {error && (
          <p className="mt-1 text-sm text-primary">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Select }

