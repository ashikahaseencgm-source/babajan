import Link from "next/link";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { PreviewBanner } from "@/components/store/preview-banner";
import { getContent } from "@/server/content";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const announcement = await getContent("home.announcement");
  return (
    <>
      <PreviewBanner />
      {announcement.enabled && announcement.text ? (
        <div className="bg-navy text-center text-[0.8125rem] text-white">
          <p className="container-bs py-2">
            {announcement.href ? (
              <Link href={announcement.href} className="underline-offset-4 hover:underline">
                {announcement.text}
              </Link>
            ) : (
              announcement.text
            )}
          </p>
        </div>
      ) : null}
      <Header />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <Footer />
    </>
  );
}
