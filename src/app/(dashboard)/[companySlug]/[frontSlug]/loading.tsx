import { Skeleton, SkeletonText, SkeletonPill } from '@/components/Skeleton';

// Fallback pra rota de detalhe da frente: breadcrumb + back button +
// fd-head (título/pill/progresso/meta grid) + fd-summary + items-list,
// nas dimensões de FrontDetailHead/FrontSummary/ItemsList.
export default function FrontLoading() {
  return (
    <>
      <div className="crumbs" aria-hidden="true">
        <SkeletonText width={70} height={11} />
        <span className="sep">›</span>
        <SkeletonText width={90} height={11} />
        <span className="sep">›</span>
        <SkeletonText width={140} height={11} />
      </div>

      <SkeletonPill width={150} height={31} />
      <div style={{ marginBottom: 22 }} />

      <div className="fd-head" aria-hidden="true">
        <div className="fd-top">
          <Skeleton style={{ width: '55%', height: 24 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <SkeletonPill width={78} height={24} />
            <SkeletonPill width={150} height={24} />
          </div>
        </div>
        <div className="fd-progress-wrap">
          <div className="plabel">
            <SkeletonText width={60} height={10} />
            <SkeletonText width={28} height={10} />
          </div>
          <Skeleton style={{ width: '100%', height: 5, borderRadius: 100 }} />
        </div>
        <div className="fd-meta">
          {[90, 120, 100, 110].map((w, i) => (
            <div className="fd-meta-item" key={i}>
              <SkeletonText width={60} height={9} />
              <SkeletonText width={w} height={13} />
            </div>
          ))}
        </div>
      </div>

      <div className="fd-summary" aria-hidden="true">
        <SkeletonText width="96%" height={13} />
        <div style={{ marginTop: 8 }} />
        <SkeletonText width="88%" height={13} />
        <div style={{ marginTop: 8 }} />
        <SkeletonText width="60%" height={13} />
      </div>

      <div className="items-head">
        <Skeleton style={{ width: 110, height: 11 }} />
        <SkeletonText width={170} height={10} />
      </div>
      <div className="items-list">
        {Array.from({ length: 5 }).map((_, i) => (
          <div className="item-row" key={i} aria-hidden="true">
            <div style={{ minWidth: 220, flex: 1 }}>
              <SkeletonText width="70%" height={14} />
            </div>
            <SkeletonPill width={100} height={22} />
            <SkeletonText width={90} height={10} />
          </div>
        ))}
      </div>
    </>
  );
}
