import { formatDateDivider } from "@/lib/format";

export function DateDivider({ iso }: { iso: string }) {
  return (
    <div className="sticky top-2 z-10 my-3 flex justify-center">
      <span className="rounded-full bg-elevated/85 px-3 py-1 text-[12px] font-medium text-secondary backdrop-blur-sm">
        {formatDateDivider(iso)}
      </span>
    </div>
  );
}
