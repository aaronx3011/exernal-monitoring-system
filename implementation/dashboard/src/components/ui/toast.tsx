import { Toaster as SonnerToaster, toast } from 'sonner'

type ToastProps = {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
}

function Toast({ title, description, variant = 'default' }: ToastProps) {
  const fn = variant === 'destructive' ? toast.error : variant === 'success' ? toast.success : toast
  fn(title || '', {
    description,
  })
}

function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
    />
  )
}

export { Toast, Toaster, toast }
