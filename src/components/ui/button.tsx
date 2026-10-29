import { cn } from '@/lib/utils'
import {
	ButtonHTMLAttributes,
	ReactElement,
	cloneElement,
	forwardRef,
	isValidElement,
} from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
	size?: 'sm' | 'md' | 'lg'
	asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant = 'primary', size = 'md', asChild = false, children, ...props }, ref) => {
		const baseClasses = cn(
			'inline-flex items-center justify-center font-medium transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none',
			{
				'bg-primary text-white hover:bg-primary-hover': variant === 'primary',
				'bg-background-card text-foreground hover:bg-border': variant === 'secondary',
				'border border-border bg-transparent text-foreground hover:bg-background-card': variant === 'outline',
				'bg-transparent text-foreground hover:bg-background-card': variant === 'ghost',
			},
			{
				'h-8 px-3 text-sm': size === 'sm',
				'h-10 px-4 text-base': size === 'md',
				'h-12 px-6 text-lg': size === 'lg',
			},
			className,
		)

		if (asChild && isValidElement(children)) {
			const child = children as ReactElement<any>
			return cloneElement(child, {
				className: cn(baseClasses, child.props.className),
				ref,
				...props,
			})
		}

		return (
			<button ref={ref} className={baseClasses} {...props}>
				{children}
			</button>
		)
	},
)

Button.displayName = 'Button'

export { Button }

