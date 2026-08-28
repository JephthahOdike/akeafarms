import Link from 'next/link';
import Image from 'next/image';
import { Leaf, MapPin, CreditCard, Users, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'About Akea Farms' };

export default function AboutPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Hero */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight">About Akea Farms</h1>
          <p className="mt-4 mx-auto max-w-2xl text-lg text-muted-foreground">
            Nigeria's trusted agricultural marketplace — connecting buyers directly with verified farmers,
            distributors, and agro-businesses.
          </p>
        </div>

        {/* Mission */}
        <div className="mb-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-8 sm:p-12">
          <h2 className="text-2xl font-bold">Our Mission</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed max-w-3xl">
            We're building a transparent, efficient marketplace that eliminates middlemen and connects
            agricultural producers directly with consumers. By giving farmers a digital storefront and
            buyers a convenient way to source fresh produce, we're transforming how Nigeria trades food.
          </p>
        </div>

        {/* Features */}
        <div className="mb-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <Sprout className="size-8 text-primary" />
              <CardTitle>Farm-Direct</CardTitle>
              <CardDescription>
                Products sourced directly from verified farms and producers across Nigeria.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <MapPin className="size-8 text-primary" />
              <CardTitle>Nationwide</CardTitle>
              <CardDescription>
                Delivery available across all 36 states and the Federal Capital Territory.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CreditCard className="size-8 text-primary" />
              <CardTitle>Secure Payments</CardTitle>
              <CardDescription>
                Paystack-powered transactions with buyer protection on every order.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Users className="size-8 text-primary" />
              <CardTitle>Verified Sellers</CardTitle>
              <CardDescription>
                Every seller is vetted and verified before joining the marketplace.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How it works */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">How It Works</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary text-xl font-bold">1</div>
              <h3 className="mt-4 font-semibold">Browse & Discover</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Explore thousands of fresh products across grains, tubers, vegetables, livestock, and more.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary text-xl font-bold">2</div>
              <h3 className="mt-4 font-semibold">Order & Pay</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add to cart, check out with Paystack, and your order gets split by seller for fulfillment.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary text-xl font-bold">3</div>
              <h3 className="mt-4 font-semibold">Receive & Track</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Track your order in real-time and receive fresh products at your doorstep.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-card border border-border p-8 text-center">
          <h2 className="text-2xl font-bold">Ready to get started?</h2>
          <p className="mt-2 text-muted-foreground">
            Join thousands of buyers and sellers on Nigeria's fastest-growing agricultural marketplace.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/products">Browse Products</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/register?role=seller">Become a Seller</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
