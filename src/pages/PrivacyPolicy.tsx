import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
            <p className="text-muted-foreground">Last Updated: January 2025</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h2 className="text-xl font-semibold mt-6 mb-3">1. Introduction</h2>
            <p>
              CrabbyTV ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains 
              how we collect, use, disclose, and safeguard your information when you use our live streaming platform.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">2. Information We Collect</h2>
            
            <h3 className="text-lg font-semibold mt-4 mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Email address, username, display name, profile picture</li>
              <li><strong>Content:</strong> Videos, live streams, comments, messages, and other user-generated content</li>
              <li><strong>Payment Information:</strong> Cryptocurrency wallet addresses for tipping and NFT transactions</li>
              <li><strong>Communication:</strong> Messages you send to us or other users through the platform</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4 mb-2">2.2 Information from Third-Party Platforms</h3>
            <p>When you connect third-party accounts (TikTok, YouTube, etc.), we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Basic profile information (username, profile picture)</li>
              <li>List of your videos and live streams</li>
              <li>Public engagement metrics</li>
            </ul>
            <p className="mt-3">
              We only access information you explicitly authorize through OAuth connections. We do not store 
              your passwords for third-party platforms.
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">2.3 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Usage Data:</strong> Pages viewed, features used, time spent on the platform</li>
              <li><strong>Device Information:</strong> Browser type, operating system, IP address</li>
              <li><strong>Cookies:</strong> Session identifiers and preference settings</li>
              <li><strong>Blockchain Data:</strong> Public transaction records, wallet addresses, NFT ownership</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve the Service</li>
              <li>Enable content creation, sharing, and live streaming</li>
              <li>Facilitate connections with third-party platforms</li>
              <li>Process transactions including tips and NFT purchases</li>
              <li>Communicate with you about your account and the Service</li>
              <li>Detect and prevent fraud, abuse, and security incidents</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">4. TikTok Integration</h2>
            <p>
              When you connect your TikTok account, we use TikTok's Login Kit and APIs to access your basic 
              profile information and video list. This integration:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Allows you to display your TikTok content on CrabbyTV</li>
              <li>Enables automatic pulling of your live streams</li>
              <li>Shows your TikTok profile information to CrabbyTV users</li>
            </ul>
            <p className="mt-3">
              You can disconnect your TikTok account at any time. Your TikTok data is subject to TikTok's 
              Privacy Policy in addition to this policy.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">5. Information Sharing and Disclosure</h2>
            <p>We may share your information with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Other Users:</strong> Your public profile, content, and activity are visible to other users</li>
              <li><strong>Service Providers:</strong> Cloud hosting, analytics, and payment processing partners</li>
              <li><strong>Blockchain Networks:</strong> NFT and cryptocurrency transaction data is publicly recorded</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
              <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal information to third parties.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">6. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your information, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication requirements</li>
              <li>Secure server infrastructure</li>
            </ul>
            <p className="mt-3">
              However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">7. Data Retention</h2>
            <p>
              We retain your information for as long as your account is active or as needed to provide services. 
              You can request deletion of your account and data at any time. Note that blockchain transactions 
              are permanent and cannot be deleted.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">8. Your Rights and Choices</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Opt-Out:</strong> Disable cookies and decline certain data collection</li>
              <li><strong>Disconnect:</strong> Remove third-party account connections</li>
              <li><strong>Data Portability:</strong> Receive your data in a structured format</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence. 
              We ensure appropriate safeguards are in place for such transfers.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">10. Children's Privacy</h2>
            <p>
              CrabbyTV is not intended for users under 13 years of age. We do not knowingly collect information 
              from children under 13. If you believe we have collected information from a child, please contact us 
              immediately.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">11. California Privacy Rights (CCPA)</h2>
            <p>
              California residents have additional rights including the right to know what personal information 
              is collected, disclosed, or sold, and the right to opt-out of sale of personal information.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">12. European Privacy Rights (GDPR)</h2>
            <p>
              If you are in the European Economic Area, you have rights under GDPR including access, rectification, 
              erasure, restriction of processing, data portability, and the right to object to processing.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">13. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by 
              posting the new policy on this page and updating the "Last Updated" date.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">14. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, please contact us through 
              the support section of the platform.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
