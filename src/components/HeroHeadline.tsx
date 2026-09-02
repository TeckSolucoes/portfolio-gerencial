import { Fragment } from 'react';

interface HeroHeadlineProps {
  eyebrow: string;
  lines: string[][];
}

export function HeroHeadline({ eyebrow, lines }: HeroHeadlineProps) {
  let wordIndex = 0;

  return (
    <>
      <div className="eyebrow">
        <span className="eyebrow-dot"></span>
        {eyebrow}
      </div>

      <h1 className="headline">
        {lines.map((words, lineIdx) => (
          <span key={lineIdx} className={`line line-${lineIdx + 1}`}>
            {words.map((word, wordIdx) => {
              const i = wordIndex++;
              return (
                <Fragment key={wordIdx}>
                  {wordIdx > 0 && ' '}
                  <span className="word" style={{ '--i': i } as React.CSSProperties}>
                    {word}
                  </span>
                </Fragment>
              );
            })}
          </span>
        ))}
      </h1>
    </>
  );
}
