import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AccordionItemProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (id: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  id,
  title,
  icon,
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onToggle,
  children,
  className,
}) => {
  const [internalIsOpen, setInternalIsOpen] = React.useState(defaultOpen);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleToggle = () => {
    if (onToggle) {
      onToggle(id);
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  return (
    <div className={cn('border-b border-border', className)}>
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between py-3 px-0 text-sm font-medium text-foreground hover:text-primary transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-primary">{icon}</span>}
          <span>{title}</span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform duration-200',
            isOpen && 'transform rotate-180'
          )}
        />
      </button>
      {isOpen && (
        <div className="pb-4 pt-1">
          {children}
        </div>
      )}
    </div>
  );
};

interface AccordionProps {
  children: React.ReactNode;
  className?: string;
  allowMultiple?: boolean;
  storageKey?: string;
  defaultOpen?: string[];
}

export const Accordion: React.FC<AccordionProps> = ({
  children,
  className,
  allowMultiple = true,
  storageKey,
  defaultOpen = [],
}) => {
  const [openItems, setOpenItems] = React.useState<Set<string>>(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as string[];
          return new Set(parsed);
        }
      } catch (e) {
        console.warn('Failed to load accordion state:', e);
      }
    }
    return new Set(defaultOpen);
  });

  React.useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(openItems)));
      } catch (e) {
        console.warn('Failed to save accordion state:', e);
      }
    }
  }, [openItems, storageKey]);

  const handleToggle = React.useCallback((id: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) {
          next.clear();
        }
        next.add(id);
      }
      return next;
    });
  }, [allowMultiple]);

  // Clone children and inject props
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === AccordionItem) {
      return React.cloneElement(child as React.ReactElement<AccordionItemProps>, {
        isOpen: openItems.has(child.props.id),
        onToggle: handleToggle,
      });
    }
    return child;
  });

  return (
    <div className={cn('w-full', className)}>
      {childrenWithProps}
    </div>
  );
};

