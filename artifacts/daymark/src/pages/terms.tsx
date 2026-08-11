/**
 * /terms — Daymark Terms of Service
 */
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-lg font-extrabold text-foreground mb-3">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
);

export default function TermsPage() {
  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] px-5 pt-14 pb-20 max-w-2xl mx-auto">
      <Link href="/landing">
        <button className="w-9 h-9 rounded-full bg-white border border-border shadow-sm flex items-center justify-center mb-6 active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
      </Link>

      <div className="mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm mb-4">
          <span className="text-white font-extrabold text-base">D</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mt-1">Last updated: August 2026</p>
      </div>

      <Section title="Using Daymark">
        <p>Daymark is a personal memory-keeping service. By creating an account, you agree to use it to store your own memories and relationships — not to harm, spam, or mislead others.</p>
        <p>You must be at least 13 years old to create an account.</p>
      </Section>

      <Section title="Your content">
        <p>You own your memories, photos, messages, and all other content you create on Daymark.</p>
        <p>By using Daymark, you grant us a limited license to store and display your content to you and those you explicitly share it with — nothing more.</p>
        <p>We do not claim ownership of your content and do not use it for advertising.</p>
      </Section>

      <Section title="What you may not do">
        <p>You may not use Daymark to: harass others, send unsolicited messages, impersonate someone else, upload illegal content, or attempt to access other users' private data.</p>
        <p>Scheduled messages and wishes must not be used for spam. We reserve the right to suspend accounts that abuse delivery features.</p>
      </Section>

      <Section title="Connections and social features">
        <p>Connections are mutual — both users must accept. Blocking a user prevents all further social interaction.</p>
        <p>Birthday wishes sent via the Globe are limited to predefined messages for non-connected users. No stranger DMs.</p>
      </Section>

      <Section title="Globe and public content">
        <p>Publishing a memory to the Globe is an explicit opt-in action. Public Globe content must not contain: personal information of others without consent, harmful imagery, or deceptive content.</p>
        <p>We may remove Globe content that violates these terms without notice.</p>
      </Section>

      <Section title="Scheduled delivery">
        <p>Messages for Later and Future Gifts are delivered at the scheduled time on a best-effort basis. We are not liable for delivery delays caused by service outages or account changes.</p>
        <p>If the recipient's account is deleted or blocked before delivery, the message will not be sent.</p>
      </Section>

      <Section title="Account deletion">
        <p>You may delete your account at any time. Deletion is permanent. We cannot restore deleted memories or messages.</p>
        <p>Public Globe content is removed immediately upon account deletion.</p>
      </Section>

      <Section title="Service availability">
        <p>We aim to keep Daymark available and reliable. However, we do not guarantee uninterrupted service. We may update, change, or discontinue features with reasonable notice.</p>
      </Section>

      <Section title="Limitation of liability">
        <p>Daymark is provided as-is. We are not liable for loss of data, missed deliveries, or any indirect damages arising from use of the service.</p>
        <p>Our total liability to you for any claim is limited to the amount you paid us in the past 12 months (which may be zero for free accounts).</p>
      </Section>

      <Section title="Changes to these terms">
        <p>We may update these terms. Significant changes will be communicated via in-app notification or email. Continued use after changes means you accept the updated terms.</p>
      </Section>

      <Section title="Contact">
        <p>Questions? Reach us at <span className="text-primary font-semibold">hello@daymark.app</span>.</p>
      </Section>
    </div>
  );
}
