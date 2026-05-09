import type { SessionResult, AnswerRecord } from '../domain/session';
import './ResultsScreen.css';

type Props = {
  result: SessionResult;
  onReplay: () => void;
  onHome: () => void;
};

const renderOperation = (record: AnswerRecord): string => {
  const { question } = record;
  if (question.op === 'mul') {
    return `${question.a} × ${question.b} = ${question.expected}`;
  }
  return `${question.a * question.b} ÷ ${question.a} = ${question.expected}`;
};

const classify = (record: AnswerRecord): 'ok' | 'wrong' | 'timeout' => {
  if (record.given === null) return 'timeout';
  return record.given === record.question.expected ? 'ok' : 'wrong';
};

const ICON: Record<'ok' | 'wrong' | 'timeout', string> = {
  ok: '✅',
  wrong: '❌',
  timeout: '⏰',
};

export const ResultsScreen = ({ result, onReplay, onHome }: Props) => {
  const correct = result.answers.filter((a) => classify(a) === 'ok').length;

  return (
    <div className="results">
      <header className="results__header">
        <h2>Bilan</h2>
        <div className="results__score">
          {correct} / {result.answers.length}
        </div>
      </header>

      <ul className="results__list">
        {result.answers.map((record, i) => {
          const kind = classify(record);
          return (
            <li key={i} className={`results__row results__row--${kind}`}>
              <span className="results__icon" aria-hidden>
                {ICON[kind]}
              </span>
              <span className="results__operation">{renderOperation(record)}</span>
              <span className="results__detail">
                {kind === 'wrong' && (
                  <>
                    réponse : {record.given} · {(record.elapsedMs / 1000).toFixed(1)}s
                  </>
                )}
                {kind === 'ok' && <>en {(record.elapsedMs / 1000).toFixed(1)}s</>}
                {kind === 'timeout' && <>pas de réponse</>}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="results__actions">
        <button type="button" className="results__btn" onClick={onReplay}>
          🔁 Refaire la même config
        </button>
        <button type="button" className="results__btn results__btn--secondary" onClick={onHome}>
          🏠 Retour à l'accueil
        </button>
      </div>
    </div>
  );
};
