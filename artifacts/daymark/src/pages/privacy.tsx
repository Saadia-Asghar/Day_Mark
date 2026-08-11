/**
 * /privacy — Daymark Privacy Policy
 * Public route — no authentication required.
 */
import { ArrowLeft } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-lg font-extrabold text-foreground mb-3">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
);

export default function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] px-5 pt-14 pb-20 max-w-2xl mx-auto">
      <button
        onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/")}
        aria-label="Back"
        className="w-9 h-9 rounded-full bg-white border border-border shadow-sm flex items-center justify-center mb-6 active:scale-95 transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm mb-4">
          <span className="text-white font-extrabold text-base">D</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mt-1">Last updated: August 2026</p>
      </div>

      <Section title="What Daymark is">
        <p>Daymark is a private memory keeper. We help you save moments, relationships, and meaningful dates — for yourself and the people you care about.</p>
        <p>We are not a social media platform. Your memories are private by default. You control what, if anything, is ever shared.</p>
      </Section>

      <Section title="Data you give us">
        <p><strong>Memories</strong> — titles, descriptions, photos, and dates you record. These are private to you unless you explicitly share them.</p>
        <p><strong>People</strong> — names, relationships, birthdays, and notes about people in your life. These records belong to you and are never visible to the person described.</p>
        <p><strong>Profile</strong> — your display name, username, bio, and optional city. You control what appears on your public profile.</p>
        <p><strong>Messages for Later</strong> — scheduled messages you compose. We store them securely until their delivery time.</p>
        <p><strong>Future Gifts</strong> — memory packages you lock until an unlock date. Only you and your intended recipient can see them when unlocked.</p>
      </Section>

      <Section title="Birthday visibility">
        <p>A birthday you save in your private People record about someone else does <em>not</em> make that person's birthday public on Daymark.</p>
        <p>Only the Daymark account owner controls their own birthday visibility. The default is <strong>nobody</strong> — completely private.</p>
        <p>If you connect your account and choose to show your birthday, you can set it to: connections only, or a public badge on the Globe. This is always opt-in.</p>
      </Section>

      <Section title="Memory Globe">
        <p>The Globe shows publicly opted-in memories on a world map. No memory appears on the Globe without your explicit action.</p>
        <p>Location on the Globe is shown at city level only by default. Precise GPS coordinates are never exposed publicly.</p>
        <p>Your identity on the Globe defaults to anonymous. You may optionally show your username.</p>
      </Section>

      <Section title="Shared memories and links">
        <p>When you create a share link, anyone with that link can view the shared fields of that memory. Links expire and can be revoked at any time.</p>
        <p>Revoking a link immediately removes public access. We delete the link record promptly.</p>
      </Section>

      <Section title="Scheduled delivery">
        <p>Messages for Later are stored encrypted at rest and delivered exactly once at the scheduled time. We do not read message content to target advertising.</p>
      </Section>

      <Section title="Photos and media">
        <p>Photos you upload are stored in private object storage. They are not indexed, publicly accessible, or used to train models.</p>
        <p>Thumbnail versions may be created for performance. Original files remain yours.</p>
      </Section>

      <Section title="Who can see your data">
        <p>Your private memories, People records, Daylinks, messages, and Future Gifts are never visible to other users by default.</p>
        <p>Connected users can see only what you explicitly share with them.</p>
        <p>Unrelated users can only see: your public Globe memories (if you've published any), your public profile (if enabled), and your public birthday badge (if you've opted in).</p>
      </Section>

      <Section title="Data retention and deletion">
        <p>You can delete your account at any time from Profile → Settings → Delete My Daymark.</p>
        <p>On deletion: all your memories, People, messages, Future Gifts, connections, Globe posts, and share links are removed. Public Globe content is removed immediately. Scheduled messages in transit may complete delivery before removal.</p>
        <p>We do not retain deleted data after processing is complete.</p>
      </Section>

      <Section title="Data export">
        <p>You can export a copy of your Daymark data from Profile → Settings → Export My Data. The export includes your profile, memories metadata, People, and message metadata — not other users' private content.</p>
      </Section>

      <Section title="Third-party services">
        <p>We use Clerk for authentication. Clerk handles your sign-in credentials and sessions. See Clerk's privacy policy for details on how they process authentication data.</p>
        <p>We do not sell your data to advertisers or third parties.</p>
      </Section>

      <Section title="Contact">
        <p>Questions about your data? Reach us at{" "}
          <a href="mailto:hellodaymark.app@gmail.com" className="text-primary font-semibold underline-offset-2 hover:underline">hellodaymark.app@gmail.com</a>.
        </p>
      </Section>
    </div>
  );
}
