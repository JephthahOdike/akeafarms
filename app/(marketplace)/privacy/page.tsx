import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Privacy Policy',
  description:
    'How Akea Farms collects, uses and safeguards your personal information.',
  path: '/privacy'
});

export default function PrivacyPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl prose prose-sm dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p>Last updated: August 2026</p>
        <p>Akea Farms ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform.</p>
        <h2>Information We Collect</h2>
        <p>We collect information you provide directly: name, email, phone number, delivery address, and payment information. We also collect usage data automatically.</p>
        <h2>How We Use Your Information</h2>
        <p>Your information is used to process orders, facilitate payments, communicate about your orders, improve our platform, and comply with legal obligations.</p>
        <h2>Data Sharing</h2>
        <p>We share your delivery information with sellers to fulfill orders. We do not sell your personal data to third parties.</p>
        <h2>Contact</h2>
        <p>For privacy questions, contact help.akeafarms@gmail.com.</p>
      </div>
    </div>
  );
}
