import { Skeleton, SkeletonText, SkeletonPill, SkeletonCard } from '@/components/Skeleton';

// Fallback do Suspense boundary automático da rota (ver loading.js do App
// Router). Reflete as dimensões reais de GroupStatRow + CompanyCard (grid de
// 3) pra não haver layout shift quando os dados reais (Prisma) entrarem.
export default function HomeLoading() {
  return (
    <>
      <SkeletonText width={140} height={11} />
      <div style={{ marginTop: 12 }} />
      <Skeleton style={{ width: '55%', height: 30, marginBottom: 10 }} />
      <SkeletonText width="70%" height={14} />
      <div style={{ marginBottom: 34 }} />

      <div className="grouprow" aria-hidden="true">
        <div className="grouprow-total">
          <SkeletonText width={90} height={10} />
          <Skeleton style={{ width: 48, height: 34 }} />
        </div>
        <div className="grouprow-breakdown">
          {[0, 1, 2].map((i) => (
            <div className="gb-item" key={i}>
              <Skeleton style={{ width: 9, height: 9, borderRadius: '50%' }} />
              <div className="gtext">
                <Skeleton style={{ width: 26, height: 18 }} />
                <SkeletonText width={54} height={9} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="companies">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} style={{ padding: '26px 26px 22px' }}>
            <SkeletonPill width={90} height={20} />
            <div style={{ marginTop: 16 }} />
            <Skeleton style={{ width: '65%', height: 21, marginBottom: 8 }} />
            <SkeletonText width="90%" height={13} />
            <div style={{ marginTop: 6, marginBottom: 22 }}>
              <SkeletonText width="60%" height={13} />
            </div>
            <Skeleton style={{ width: '100%', height: 6, borderRadius: 100, marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 18, marginBottom: 18 }}>
              {[0, 1, 2].map((j) => (
                <SkeletonText key={j} width={64} height={12} />
              ))}
            </div>
            <SkeletonText width={100} height={11} />
          </SkeletonCard>
        ))}
      </div>
    </>
  );
}
