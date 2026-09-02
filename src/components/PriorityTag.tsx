export function PriorityTag({ prioritized }: { prioritized: boolean }) {
  return prioritized ? (
    <span className="priority-tag yes">Prioridade da diretoria</span>
  ) : (
    <span className="priority-tag no">Fora da priorização atual</span>
  );
}
