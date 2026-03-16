type BlankPageProps = {
  title: string;
};

export function BlankPage({ title }: BlankPageProps) {
  return (
    <main className="min-h-screen bg-[#e8e8ea] px-5 pb-16 pt-32 text-[#2a3040]">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs uppercase tracking-[0.18em] text-[#676d78]">Page Template</p>
        <h1 className="mt-4 text-4xl font-semibold text-[#222734] sm:text-6xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#555d6d] sm:text-base">
          This route is intentionally left minimal so you can decide what to build here next.
        </p>
        <div className="mt-10 h-[55vh] rounded-3xl border border-dashed border-[#9499a2] bg-[#f4f4f5]" />
      </div>
    </main>
  );
}
