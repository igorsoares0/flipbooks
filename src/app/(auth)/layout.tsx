export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex min-w-0 px-6 py-8 sm:px-12 lg:px-24 lg:py-11">{children}</div>

      <div className="flex min-w-0 flex-col justify-between gap-10 overflow-hidden bg-accent px-8 py-12 text-white max-lg:hidden xl:px-[72px] xl:py-14">
        <span className="text-[13px] opacity-80">Read on Flipbook</span>
        <div className="flex justify-center" aria-hidden>
          <div className="flex -rotate-2 shadow-[0_30px_70px_rgba(0,0,0,.35)]">
            <div className="h-[294px] w-[220px] bg-[#F4F0E8] p-5">
              <div className="h-[62%] bg-[#CFC6B4]" />
              <p className="mt-3 font-serif text-[10px] leading-normal text-[#3C3426]">The table is set by eight, the doors stay open.</p>
            </div>
            <div className="h-[294px] w-[220px] bg-[#FAF8F3] p-5">
              <p className="font-serif text-[25px] leading-[1.02] tracking-[-0.5px] text-[#17150F]">Light, linen and long evenings</p>
            </div>
          </div>
        </div>
        <p className="max-w-[520px] font-serif text-[38px] leading-[1.1] tracking-[-1px] text-balance">Every PDF deserves a better reading experience.</p>
      </div>
    </div>
  );
}
