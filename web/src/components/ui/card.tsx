import * as React from 'react';
import { cn } from '../../lib/utils';

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('rounded-md bg-secondary p-3', className)}
    {...props}
  />
));
Card.displayName = 'Card';

export { Card };

