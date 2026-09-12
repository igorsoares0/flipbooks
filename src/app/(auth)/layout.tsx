export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-wrap">
      <div className="flex min-w-0 flex-[1_1_420px] items-center justify-center bg-paper px-7 py-10">{children}</div>

      <div className="flex min-w-0 flex-[1_1_420px] items-center justify-center overflow-hidden bg-ink px-8 py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-[30px] flex gap-3.5" aria-hidden>
            <div className="aspect-[3/4] flex-1 -rotate-[4deg] rounded-[3px] bg-on-dark p-4 shadow-float">
              <div className="font-serif text-xl leading-[1.05]">
                Summer
                <br />
                <em>Catalog</em>
              </div>
              <div className="mt-3 h-1 rounded-[3px] bg-[rgba(23,21,15,.14)]" />
              <div className="mt-[5px] h-1 w-[70%] rounded-[3px] bg-[rgba(23,21,15,.14)]" />
              <div className="placeholder-gradient mt-3.5 h-[46%] rounded-[2px]" />
            </div>
            <div className="flex aspect-[3/4] flex-1 translate-y-3.5 rotate-3 flex-col rounded-[3px] bg-paper-2 p-4 shadow-float">
              <div className="h-[58%] rounded-[2px] bg-[linear-gradient(150deg,#C6CFEA,#9FB0E0)]" />
              <div className="mt-3 text-[11px] font-semibold">Chapter two</div>
              <div className="mt-2 h-1 rounded-[3px] bg-[rgba(23,21,15,.14)]" />
              <div className="mt-[5px] h-1 w-[60%] rounded-[3px] bg-[rgba(23,21,15,.14)]" />
            </div>
          </div>
          <p className="font-serif text-[28px] leading-[1.2] tracking-[-0.5px] text-pretty text-on-dark">
            Every PDF deserves a better reading experience.
          </p>
          <p className="mt-3 text-[12.5px] leading-[1.6] text-on-dark-dim-2">
            Upload once, publish a link, embed anywhere, and see exactly which pages people read.
          </p>
        </div>
      </div>
    </div>
  );
}
