import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    // Com id (vindo do <label htmlFor>), o erro fica ligado ao campo para o
    // leitor de tela (auditoria de acessibilidade de 20/11/2026).
    const idDoErro = error && props.id ? `${props.id}-erro` : undefined
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            'w-full h-10 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
            error && 'border-primary ring-1 ring-primary',
            className
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={idDoErro}
          {...props}
        />
        {error && (
          <p id={idDoErro} className="mt-1 text-sm text-primary">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }

