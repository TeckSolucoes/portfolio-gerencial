export function OwnerBadge({ name, initials }: { name: string; initials: string }) {
  return (
    <div className="owner">
      <span className="oav">{initials}</span>
      {name}
    </div>
  );
}
