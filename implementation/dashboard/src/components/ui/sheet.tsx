import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetContextType {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextType | undefined>(undefined)

function useSheet() {
  const ctx = React.useContext(SheetContext)
  if (!ctx) throw new Error('Sheet components must be used within a Sheet')
  return ctx
}

function Sheet({ children, open: controlledOpen, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (val: boolean) => {
    if (!isControlled) setInternalOpen(val)
    onOpenChange?.(val)
  }
  return <SheetContext.Provider value={{ open, onOpenChange: setOpen }}>{children}</SheetContext.Provider>
}

function SheetTrigger({ children, asChild, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = useSheet()
  return (
    <button onClick={(e) => { onOpenChange(true); onClick?.(e) }} {...props}>
      {children}
    </button>
  )
}

function SheetContent({ children, className, side = 'right', ...props }: React.HTMLAttributes<HTMLDivElement> & { side?: 'left' | 'right' }) {
  const { open, onOpenChange } = useSheet()

  React.useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80" onClick={() => onOpenChange(false)} />
      <div
        className={cn(
          'fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out',
          side === 'right' && 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm animate-in slide-in-from-right',
          side === 'left' && 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm animate-in slide-in-from-left',
          className,
        )}
        {...props}
      >
        {children}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </>
  )
}

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
)

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
)

const SheetTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn('text-lg font-semibold text-foreground', className)} {...props} />
)

const SheetDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-muted-foreground', className)} {...props} />
)

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription }
