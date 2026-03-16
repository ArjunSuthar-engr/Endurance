import { BlankPage } from "@/components/blank-page";

type SlugPageProps = {
  params: Promise<{ slug: string }>;
};

function toTitle(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function SlugPage({ params }: SlugPageProps) {
  const { slug } = await params;
  return <BlankPage title={toTitle(slug)} />;
}
