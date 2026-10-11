import type { Metadata } from "next";
import { requireUser } from "@/server/session";
import { PasswordForm, ProfileForm } from "@/components/account/account-forms";

export const metadata: Metadata = { title: "Profile & Security", robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  return (
    <div className="grid gap-12 xl:grid-cols-2">
      <section aria-labelledby="profile">
        <h2 id="profile" className="t-card">
          Profile
        </h2>
        <p className="mt-2 text-sm text-slate">Email: {user.email}</p>
        <div className="mt-5">
          <ProfileForm name={user.name} />
        </div>
      </section>
      <section aria-labelledby="security">
        <h2 id="security" className="t-card">
          Change password
        </h2>
        <div className="mt-5">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}
