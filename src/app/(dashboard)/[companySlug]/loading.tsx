import { Skeleton, SkeletonText, SkeletonPill } from '@/components/Skeleton';

// Fallback pra rota da empresa: breadcrumb + toprow (título/lede) +
// filter chips + grid de ~6 front cards, nas mesmas dimensões de
// Breadcrumbs/FilterChips/FrontCard pra evitar layout shift.
export default function CompanyLoading() {
  return (
    <>
      <div className="crumbs" aria-hidden="true">
        <SkeletonText width={70} height={11} />
        <span className="sep">›</span>
        <SkeletonText width={110} height={11} />
      </div>

      <div className="toprow">
        <div>
          <Skeleton style={{ width: 220, height: 26, marginBottom: 10 }} />
          <SkeletonText width={320} height={13} />
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 24 }} aria-hidden="true">
        {[70, 68, 84, 96].map((w, i) => (
          <SkeletonPill key={i} width={w} height={29} />
        ))}
      </div>

      <div className="fronts-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div className="front-card" key={i} style={{ cursor: 'default' }} aria-hidden="true">
            <div className="fc-head">
              <Skeleton style={{ width: '65%', height: 16 }} />
              <SkeletonPill width={72} height={22} />
            </div>
            <SkeletonPill width={150} height={20} />
            <Skeleton style={{ width: '100%', height: 5, borderRadius: 100 }} />
            <div className="owner">
              <Skeleton style={{ width: 22, height: 22, borderRadius: '50%' }} />
              <SkeletonText width={90} height={12} />
            </div>
            <div className="fc-foot">
              <SkeletonText width={150} height={11} />
              <SkeletonText width={44} height={11} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
