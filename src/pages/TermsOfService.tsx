import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
            <p className="text-muted-foreground">Last Updated: January 2025</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using CrabbyTV ("the Service"), you accept and agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use the Service.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">2. Description of Service</h2>
            <p>
              CrabbyTV is a live streaming and video sharing platform that enables creators to broadcast content, 
              share videos, and interact with their audience. The Service integrates with third-party platforms 
              including but not limited to TikTok, YouTube, and blockchain networks.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">3. User Accounts</h2>
            <p>
              To access certain features, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and current information</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">4. Third-Party Integrations</h2>
            <p>
              When you connect third-party accounts (such as TikTok or YouTube), you authorize CrabbyTV to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your basic profile information from these platforms</li>
              <li>Retrieve your content including videos and live streams</li>
              <li>Display this content on CrabbyTV</li>
            </ul>
            <p className="mt-3">
              Your use of third-party services is also governed by their respective terms of service and privacy policies. 
              CrabbyTV is not responsible for the practices of third-party platforms.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">5. Content and Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Upload, post, or transmit any content that is illegal, harmful, threatening, or offensive</li>
              <li>Violate any intellectual property rights</li>
              <li>Impersonate any person or entity</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use the Service for any unauthorized commercial purposes</li>
              <li>Engage in any form of harassment or hate speech</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">6. Intellectual Property</h2>
            <p>
              You retain all rights to content you upload. By posting content on CrabbyTV, you grant us a worldwide, 
              non-exclusive, royalty-free license to use, reproduce, distribute, and display your content for the 
              purpose of operating and promoting the Service.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">7. NFTs and Blockchain Transactions</h2>
            <p>
              CrabbyTV offers NFT minting and trading features. You acknowledge that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Blockchain transactions are irreversible</li>
              <li>You are responsible for understanding the risks of cryptocurrency transactions</li>
              <li>CrabbyTV does not control blockchain networks and is not liable for transaction failures</li>
              <li>Gas fees and transaction costs are your responsibility</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">8. Tipping and Payments</h2>
            <p>
              Our tipping feature allows users to support creators through cryptocurrency payments. 
              All tips are final and non-refundable. CrabbyTV may charge service fees for processing transactions.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">9. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for violations of these Terms 
              or for any other reason at our sole discretion. You may also delete your account at any time through 
              your profile settings.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">10. Disclaimers and Limitation of Liability</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, 
              CRABBYTV SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM 
              YOUR USE OF THE SERVICE.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">11. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. Continued use of the Service after changes constitutes 
              acceptance of the modified Terms.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable laws, without regard 
              to conflict of law provisions.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">13. Contact Information</h2>
            <p>
              For questions about these Terms, please contact us through the support section of the platform.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
