import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Terms of Service',
  description:
    'The terms and conditions governing the use of the Akea Farms agricultural marketplace.',
  path: '/terms'
});

export default function TermsPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl prose prose-sm dark:prose-invert">
        <h1>Terms of Service</h1>
        <p>Last updated: August 2026</p>
        <p>Welcome to Akea Farms. By using our platform, you agree to these Terms of Service.</p>
        <h2>Use of the Platform</h2>
        <p>You must be at least 18 years old. You are responsible for maintaining the confidentiality of your account.</p>
        <h2>Buyer Terms</h2>
        <p>Buyers agree to pay for products ordered. Prices are as displayed at checkout. Refunds are subject to our return policy.</p>
        <h2>Seller Terms</h2>
        <p>Sellers must provide accurate product information. The platform charges a commission on each sale. Sellers are responsible for fulfilling orders.</p>
        <h2>Payments</h2>
        <p>All payments are processed through Paystack. The platform holds funds until settlement.</p>
        <h2>Liability</h2>
        <p>Akea Farms is a marketplace connecting buyers and sellers. We are not liable for the quality of products sold by third-party sellers.</p>
        <h2>Contact</h2>
        <p>For questions about these terms, contact help.akeafarms@gmail.com.</p>
      </div>
    </div>
  );
}
