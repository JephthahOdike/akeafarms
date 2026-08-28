import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatNaira } from '@/lib/utils';

interface CartSummaryProps {
  subtotal: number;
  itemCount: number;
}

export default function CartSummary({ subtotal, itemCount }: CartSummaryProps) {
  const shippingFee = itemCount > 0 ? 500 : 0; // flat rate, calculated by seller during checkout

  return (
    <div className="sticky top-24 space-y-6 rounded-xl border border-border bg-card p-6">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal ({itemCount} item{itemCount === 1 ? '' : 's'})</span>
          <span className="font-semibold text-foreground">{formatNaira(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Estimated Shipping</span>
          <span className="font-semibold text-foreground">{formatNaira(shippingFee)}</span>
        </div>
        <div className="flex justify-between pt-4 border-t border-border">
          <span className="text-xl font-bold text-foreground">Total</span>
          <span className="text-2xl font-bold tracking-tight text-primary">{formatNaira(subtotal + shippingFee)}</span>
        </div>

        <div className="pt-4">
          <Button asChild size="lg" className="w-full" disabled={itemCount === 0}>
            <Link href="/checkout">
              Proceed to Checkout ({formatNaira(subtotal + shippingFee)})
            </Link>
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <p>Your order will be split by seller for fulfillment.</p>
          <p className="mt-1">Each seller manages their own shipping.</p>
        </div>
      </CardContent>
    </div>
  );
}