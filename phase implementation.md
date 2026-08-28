AKEA FARMS — COMPLETE IMPLEMENTATION ROADMAP
TRAE AI MASTER IMPLEMENTATION PROMPT
IMPORTANT INSTRUCTION

You have already completed a comprehensive audit of the Akea Farms platform.

Do not perform another audit before starting. Use the audit findings below as the source of truth.

The objective is to implement every unimplemented, incomplete, broken, deferred, placeholder, security-related, UX-related, performance-related, administrative, financial, communication, SEO and quality-of-life item identified in the audit.

Nothing should be intentionally skipped.

Do not remove existing working functionality.

Do not redesign working features unnecessarily.

Do not introduce unnecessary dependencies.

Maintain the existing architecture, Supabase integration, Paystack integration, Brevo integration, role system and security model unless a change is required to fix a documented issue.

Existing business configuration
Platform name: Akea Farms
Platform commission: 15%
Payment provider: Paystack
Transactional email provider: Brevo
Database/backend: Supabase
Product image optimization: Sharp/WebP optimization + multi-bucket storage
User roles:
Buyer
Seller/Farmer
Employee/Worker
Admin
BLOCK 1 — PHASES 1–11
CORE PLATFORM, SECURITY, PAYMENTS, ADMIN & TRANSACTIONAL SYSTEMS
PHASE 1 — CRITICAL SECURITY & DATA PRIVACY
Objective

Fix every critical security vulnerability before implementing additional functionality.

Implement
1. Seller profile data exposure

Fix the critical RLS vulnerability where:

seller_profiles
USING (true)

allows public access to sensitive seller information.

Sensitive information includes:

Bank account number
Bank name
CAC number
TIN
Settlement information
Other private seller information

Implement proper RLS policies so:

Sellers can access their own private information.
Admins can access seller information where required.
Employees can access information only where their permissions allow.
Public users can only access intentionally public seller/store information.

Do not expose sensitive seller information through public APIs, server components or client components.

Also review
Supabase RLS
Server actions
API routes
Database functions
Public seller pages
Seller profile queries
Store pages

Ensure there is no alternative route through which private seller information can leak.

PHASE 2 — SELLER OWNERSHIP & DATA ACCESS FIXES

Fix the seller ID mismatch identified in:

app/seller/orders/page.tsx
app/seller/wallet/page.tsx

The schema uses:

seller_wallets.seller_id → seller_profiles.id

and:

order_items.seller_id → seller_profiles.id

Ensure application queries correctly resolve:

auth user
→ profiles
→ seller_profiles
→ seller_profiles.id

Sellers must correctly see:

Their orders
Their order items
Their wallet
Their earnings
Their commissions
Their settlement information

Verify that sellers cannot access another seller's information.

PHASE 3 — PAYSTACK SECURITY & FINANCIAL ATOMICITY

Harden the Paystack payment architecture.

Implement
Provider reference idempotency

Add a database-level unique constraint on:

payments.provider_reference

Prevent duplicate webhook processing.

Wallet updates

Replace unsafe:

SELECT → calculate → UPDATE

patterns with atomic database operations.

Webhook processing

Make the entire seller wallet credit process transactional.

If one seller's wallet update fails:

The entire transaction should safely roll back.
Do not leave partially credited orders.

Ensure:

Paystack signature validation remains active.
Amount is calculated server-side.
Seller totals are calculated server-side.
Commission remains 15%.
Paystack's own fee remains separate.
Users cannot manipulate payment amount.
Users cannot manipulate seller allocation.
Users cannot mark orders as paid.
Test
Successful payment
Duplicate webhook
Invalid webhook signature
Modified payment amount
Multiple sellers
Failed wallet update
Webhook retry
PHASE 4 — SELLER BANK INFORMATION SECURITY

The current UI claims bank information is encrypted while the audit found it stored in plaintext.

Choose the safest practical architecture.

Either:

Option A

Implement proper encryption for sensitive bank information using an appropriate server-side encryption strategy.

Or:

Option B

If encryption is not implemented, remove misleading claims from the UI and ensure the data is protected through:

RLS
Server-only access
Strict authorization
No client-side exposure
No unnecessary API responses

Do not falsely claim data is encrypted.

Prefer actual encryption if it can be implemented safely without compromising the existing system.

Also ensure bank-detail changes:

Require re-authentication.
Are audit logged.
Cannot be modified by unauthorized users.
PHASE 5 — BREVO TRANSACTIONAL EMAIL SYSTEM

Fully wire the existing Brevo email templates.

Currently:

9 email templates exist.
None are actually called.

Implement actual email sending.

Emails include
Password reset
Order confirmation
Payment confirmation
Order/payment notifications
Dispatch notification
Delivery notification
Seller notifications
Admin notifications

Use:

BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=Akea Farms

Do not expose these variables to the browser.

Never use:

NEXT_PUBLIC_BREVO_API_KEY
Email behavior

Emails must:

Be sent server-side.
Fail gracefully.
Never expose API keys.
Be logged appropriately.
Avoid leaking sensitive information.
Not block critical transactions unnecessarily.
PHASE 6 — NOTIFICATION PREFERENCE ENFORCEMENT

The platform currently stores notification preferences but does not enforce them.

Implement a centralized notification-preference system.

Before sending a notification:

Identify recipient.
Identify notification type.
Check recipient preferences.
Determine whether email/in-app notification is enabled.
Send only where permitted.

Support appropriate notification categories such as:

Orders
Payments
Dispatch
Delivery
Account/security
Seller activity
Platform announcements

Ensure critical security/account emails cannot accidentally be disabled if they are required.

Implement seller notification preferences as well.

PHASE 7 — ADMIN SELLER MANAGEMENT

Turn:

/admin/sellers

from read-only into a fully functional administration interface.

Implement:

View sellers
Search sellers
Review pending sellers
Approve seller
Reject seller
Suspend seller
Unsuspend seller where authorized
View seller information
View relevant business information
View seller status

Ensure seller approval/rejection:

Is server-side authorized.
Is audit logged.
Cannot be performed by sellers.
Cannot bypass RLS.

Do not expose sensitive bank information unnecessarily.

PHASE 8 — ADMIN ORDERS & CATEGORIES

Fix the dead routes.

Orders

Implement:

/admin/orders/[id]

The page should provide:

Order information
Buyer
Sellers
Products
Payment status
Order status
Tracking
Amount breakdown
Platform commission
Seller earnings
Relevant timestamps

Add appropriate admin actions.

Categories

Implement:

/admin/categories/new

Also make category management functional.

Admin should be able to:

Create categories
Edit categories
Delete/deactivate categories
View categories

Ensure deletion cannot break existing products.

PHASE 9 — ADMIN PAYMENTS, SETTLEMENTS & COMMISSION MANAGEMENT

Turn the financial administration area into a functional system.

Payments

Admin should be able to:

View payments
View payment details
Search/filter payments
View payment status
View Paystack reference
View platform commission
View seller net earnings

Implement appropriate refund/chargeback preparation where actual automation is not yet safe.

Settlements

Implement:

Settlement review
Settlement approval/rejection
Settlement status
Seller earnings
Platform commission
Paystack-related information
Commission editor

Create an admin UI for:

commission_rates

Allow authorized admins to configure:

Global commission
Seller-specific commission
Category-specific commission

Default platform commission must remain:

15%

Do not allow unauthorized users to change financial configuration.

Every financial configuration change must be audit logged.

PHASE 10 — EMPLOYEE/WORKER MANAGEMENT

Complete the employee system.

Implement:

Employee dashboard

Employees should have a meaningful landing page based on their permissions.

Example:

Employee Dashboard
├── Assigned permissions
├── Available modules
├── Recent activity
└── Relevant metrics
Employee lifecycle

Admin must be able to:

Promote user → employee
Assign permissions
Revoke permissions
Deactivate employee
Downgrade/remove employee status

Ensure employees cannot grant themselves permissions.

Permissions

Maintain granular permissions such as:

users.view
sellers.view
sellers.manage
products.view
products.manage
orders.view
orders.manage
payments.view
settlements.view
tracking.manage
support.manage
reports.view

Use server-side permission checks and RLS.

PHASE 11 — ADMIN NOTIFICATIONS, SUPPORT & PLATFORM CONFIGURATION

Complete the administrative communication infrastructure.

Admin notification center

Fix the notification bell currently pointing to:

/admin/support

Create a real notification center.

Implement:

Unread count
Read/unread state
Mark as read
Mark all as read
Notification history
Relevant links
Admin support

Replace the support placeholder with a functional support foundation.

Implement:

Support tickets
Ticket creation
Ticket status
Ticket priority
User information
Admin/employee assignment
Responses
Ticket history
Admin settings

Complete the platform configuration areas including:

General
Payments
Shipping
Notifications
Catalog

Do not expose secrets through the UI.

BLOCK 2 — PHASES 12–22
MARKETPLACE EXPERIENCE, COMMUNICATION, ANALYTICS, SEO, PERFORMANCE & FINAL HARDENING
PHASE 12 — SELLER & BUYER MESSAGING

Implement the currently stubbed:

/seller/messages
/buyer/messages

Build a secure messaging foundation.

Users should be able to:

View conversations
Open conversations
Send messages
Receive messages
View timestamps
See read/unread status

Security requirements:

Buyers can only access their conversations.
Sellers can only access conversations involving them.
Admin/authorized employees can access conversations according to permissions.
Prevent unauthorized conversation ID access.
Sanitize message content.
Protect against injection/XSS.
PHASE 13 — TRACKING MANAGEMENT

The tracking timeline already works.

Now make the management side functional.

Sellers

Allow authorized sellers to:

Create tracking event
Update tracking status
Add notes
Add timestamp
Update shipment progress
Admin

Allow admin/authorized employees to:

Create tracking event
Update tracking status
Correct erroneous events
View tracking history

Maintain status colors:

🔵 Blue — product on the move/in progress
🟢 Green — successfully delivered/dispatched
🔴 Red — damaged/failed/issue/cancelled
Notifications

When tracking changes:

Create in-app notification.
Send Brevo email where preference permits.
PHASE 14 — INVOICE & RECEIPT EXPERIENCE

The invoice API exists but isn't exposed properly.

Implement buyer-facing invoice functionality.

Users should be able to:

View invoice
Download invoice
Download receipt
Access invoice from order history

Fix the issue where deleting a shipping address causes:

Order not found

Invoices must remain available even if the original address is later deleted.

Display:

Invoice number
Order number
Date
Buyer
Seller
Items
Quantity
Unit price
Subtotal
Shipping
Platform fee where appropriate
Total

Add tax/VAT support structurally without incorrectly charging VAT if the platform does not currently have a tax configuration.

PHASE 15 — MULTI-SELLER CART & CHECKOUT

Complete the multi-seller shopping experience.

When a cart contains products from multiple sellers, clearly show:

Seller A
Products
Subtotal

Seller B
Products
Subtotal

Shipping
Total

Ensure backend checkout continues creating orders correctly by seller.

Verify:

Seller ownership
Commission calculation
Payment allocation
Order splitting
Seller wallet allocation
Tracking
Notifications
Invoice generation

Platform commission remains 15%.

PHASE 16 — ADMIN REPORTS & ANALYTICS

Replace the reports placeholder.

Implement useful dashboards for:

Sales
Total sales
Orders
Average order value
Sales over time
Sellers
Total sellers
Active sellers
Pending sellers
Suspended sellers
Buyers
Total buyers
Active buyers
New buyers
Financial
Gross transaction value
Platform commission
Seller earnings
Paystack fees
Settlements
Outstanding amounts
Products
Total products
Approved products
Pending products
Rejected products
Best-performing products

Add:

Date filters
Basic charts
Export functionality where practical

Do not expose sensitive personal information unnecessarily.

PHASE 17 — ADMIN PRODUCT MANAGEMENT

Turn:

/admin/products

into a functional product-management area.

Admin should be able to:

View products
Search products
Filter products
Approve products
Reject products
Edit where authorized
Deactivate products
Review seller/product relationship

Ensure sellers cannot manipulate admin approval status.

PHASE 18 — LOADING, ERROR & NOT-FOUND EXPERIENCE

The audit found missing boundaries across buyer, marketplace and subroutes.

Implement appropriate:

loading.tsx
error.tsx
not-found.tsx

where needed.

Add Suspense boundaries for data-heavy pages where appropriate.

Ensure users never encounter unexplained blank screens.

Error pages must:

Be user friendly.
Not expose stack traces.
Not expose secrets.
Provide retry/navigation options.
PHASE 19 — SEO & SOCIAL SHARING

Complete SEO implementation.

Implement:

Metadata

Every meaningful page should have:

Title
Description
Canonical URL
Open Graph

Implement:

og:title
og:description
og:image
og:url
og:type
Twitter/X cards

Implement appropriate Twitter metadata.

Structured data

Where appropriate implement JSON-LD for:

Products
Organization
Website
Breadcrumbs
Categories

Do not generate fake product information.

Use the Akea Farms branding.

PHASE 20 — PERFORMANCE & ADMIN UX

Improve platform speed and usability.

Admin lists

Add:

Pagination
Search
Filters
Sorting where useful

Remove unnecessary:

.limit(100)

patterns where proper pagination should be used.

Database performance

Review:

Missing indexes
Repeated queries
Sequential queries
N+1 queries
Wallet operations
Commission lookup

Optimize without compromising correctness.

Code cleanup

Review:

_get_public_seller_info()

Either:

Wire it correctly into public seller/store pages, or
Remove it if genuinely unnecessary.

Consolidate the duplicate inline Supabase client in:

_cart-items.tsx

to the existing Supabase client architecture.

PHASE 21 — PLATFORM SHIPPING, TAX & FINANCIAL QUALITY

Implement the remaining platform-level financial infrastructure.

Shipping

Implement admin shipping configuration:

Shipping zones
Shipping rates
Applicable locations
Seller/product shipping rules where required
Tax/VAT

Build the architecture for:

VAT/tax configuration
Tax rates
Tax calculation
Invoice tax breakdown

Do not hard-code a tax rate without configuration.

Refunds/chargebacks

Create a safe administrative workflow for:

Refund requests
Refund status
Chargeback records
Admin review

Do not implement unsafe automatic refund behavior without Paystack verification.

Rounding

Define a consistent financial rounding strategy.

Use the smallest currency unit where appropriate.

Ensure calculations remain deterministic.

PHASE 22 — FINAL SECURITY, QA & PRODUCTION HARDENING

This is the final comprehensive pass.

Do not consider the platform complete until every item has been tested.

Security

Test:

RLS
Authentication
Authorization
Role escalation
Employee permission escalation
Seller isolation
Buyer isolation
Admin access
API authorization
Server actions
File uploads
Image MIME validation
Injection
XSS
CSRF where applicable
IDOR
Sensitive data exposure
Secret exposure
Environment variables
Payment manipulation
Webhook forgery
Duplicate webhooks
Replay attacks
Rate limiting where appropriate
Account security

Test:

Login
Logout
Password reset
Password change
Email change
Email verification
Account deactivation
Employee deactivation
Session invalidation
Payment security

Test:

Paystack success
Paystack failure
Duplicate webhook
Invalid signature
Incorrect amount
Multiple sellers
15% commission
Seller net amount
Paystack fee separation
Wallet credit
Settlement
Data privacy

Verify that:

Bank details are not publicly accessible.
CAC/TIN are not publicly accessible.
Private buyer information isn't exposed.
Private seller information isn't exposed.
Employee data isn't exposed unnecessarily.
API responses return only necessary fields.
Functional QA

Test every role:

Buyer
Register
Login
Browse
Search
Product details
Cart
Multi-seller checkout
Payment
Orders
Tracking
Invoice
Profile
Addresses
Notifications
Messages
Password
Email
Account lifecycle
Seller/Farmer
Register/apply
Login
Dashboard
Store
Products
Product images
Orders
Tracking
Wallet
Settlements
Profile
Bank details
Notifications
Messages
Account lifecycle
Employee
Login
Dashboard
Permissions
Assigned modules
Admin operations
Restrictions
Deactivation
Admin
Dashboard
Users
Sellers
Products
Categories
Orders
Payments
Settlements
Commission
Tracking
Notifications
Support
Employees
Reports
Settings
Platform configuration
FINAL REQUIREMENT — NOTHING LEFT UNTURNED

After completing Phase 22, perform a final repository-wide search for:

TODO
FIXME
Coming soon
Placeholder
Stub
Not implemented
Empty handlers
Buttons without actions
Dead links
Missing routes
Console errors
Unused server actions
Unused email functions
Unused database functions
Broken navigation
Missing loading states
Missing error states
Missing authorization checks
Missing RLS policies
Hardcoded configuration
Hardcoded secrets
Temporary development logic

For every finding:

Fix it, remove it, or document why it intentionally remains.

Do not simply report an issue if it can reasonably be implemented.

IMPLEMENTATION RULES
1. Work phase-by-phase

Do not attempt all 22 phases simultaneously.

Start with:

PHASE 1

When Phase 1 is complete:

Test it.
Verify there are no regressions.
Report exactly what changed.
Report files modified/created.
Report database migrations created.
Report tests performed.
Then proceed to Phase 2.

Continue sequentially through Phase 22.

2. Database migrations

Never silently modify production schema.

Create properly numbered Supabase migrations.

Before applying a migration:

Explain what it changes.
Ensure it is safe.
Avoid destructive changes unless explicitly required.
Preserve existing data.
3. Environment variables

Use placeholders only.

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=

BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=Akea Farms

Use test Paystack credentials during testing and live credentials only during deployment.

Never hardcode API keys or secrets into source code.

4. Security-first principle

Any feature involving:

Money
Authentication
User data
Seller data
Bank details
Permissions
Admin functionality

must be protected server-side.

Do not rely on hidden UI buttons or frontend role checks as security.

5. Preserve existing functionality

Do not unnecessarily rewrite working:

Authentication
Paystack
Supabase
Seller marketplace
Buyer marketplace
Product upload
Image optimization
Commission calculation
Tracking
Settings
RLS

Only modify existing functionality where required to fix an identified issue or improve security/reliability.

6. Maintain Akea Farms branding

Use:

Akea Farms

throughout the application.

Do not introduce unrelated branding.

7. Final success condition

The platform should not be considered complete merely because it builds successfully.

It is complete when:

Every route works, every button has a purpose, every role has the correct access, every financial operation is secure, every critical notification works, private data is protected, admin operations are functional, and there are no known unimplemented features from the audit.