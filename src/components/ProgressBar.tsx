export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="progress">
      <span style={{ width: `${percent}%` }}></span>
    </div>
  );
}
