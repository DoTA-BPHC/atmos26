export default function PosterPlaceholder({ title, clubs, category }: { title: string; clubs?: string; category: string }) {
  return (
    <div
      aria-hidden="true"
      className="@container relative mb-6 aspect-[4/3] w-full shrink-0 overflow-hidden border border-brass-line bg-soot transition-[filter] duration-700 ease-out-expo group-hover:brightness-125 motion-reduce:transition-none"
    >
      <div className="absolute inset-4 flex flex-col gap-2">
        <p className="display line-clamp-3 break-words text-[clamp(1.5rem,11cqw,3.5rem)] text-stone">{title}</p>
        <p className="text-[0.85rem] text-brass-hi">{category}</p>
        {clubs && <p className="mt-auto line-clamp-2 text-[0.85rem] text-stone-dim">{clubs}</p>}
      </div>
    </div>
  );
}
