// A sideways row that can be swiped (touch, trackpad) and stepped with arrow buttons, as F1 TV's rows: the arrows show
// only when there is more to see in that direction.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, cx } from '../components/ui';

export function Carousel({ children, className, label }: { children: ReactNode; className: string; label?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });
  const measure = () => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  };
  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const step = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };
  const arrow = (dir: 1 | -1) => (
    <button
      type="button"
      onClick={() => step(dir)}
      aria-label={dir === 1 ? 'Next' : 'Previous'}
      className={cx(
        'absolute top-[calc(50%-1.25rem)] z-10 hidden size-10 place-items-center rounded-full bg-black/70 text-white ring-1 ring-white/25 backdrop-blur transition-opacity hover:bg-black/90 sm:grid',
        dir === 1 ? '-right-3' : '-left-3',
        (dir === 1 ? edge.end : edge.start) && 'pointer-events-none opacity-0',
      )}
    >
      <Icon name="chevron" size={18} className={dir === -1 ? 'rotate-180' : undefined} />
    </button>
  );
  return (
    <div className="relative" aria-label={label}>
      {arrow(-1)}
      <ul ref={ref} onScroll={measure} className={cx('hscroll snap-x snap-mandatory [&>*]:snap-start', className)}>
        {children}
      </ul>
      {arrow(1)}
    </div>
  );
}
