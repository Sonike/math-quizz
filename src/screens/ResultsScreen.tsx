import type { SessionResult, AnswerRecord } from '../domain/session';
import { totalScore } from '../domain/scoring';
import './ResultsScreen.css';

type Props = {
  result: SessionResult;
  onReplay: () => void;
  onHome: () => void;
};

type Kind = 'ok' | 'slow' | 'wrong' | 'timeout';

const renderOperation = (record: AnswerRecord): string => {
  const { question } = record;
  if (question.op === 'mul') {
    return `${question.a} × ${question.b} = ${question.expected}`;
  }
  return `${question.a * question.b} ÷ ${question.a} = ${question.expected}`;
};

const classify = (record: AnswerRecord, targetMs: number): Kind => {
  if (record.given === null) return 'timeout';
  if (record.given !== record.question.expected) return 'wrong';
  return record.elapsedMs <= targetMs ? 'ok' : 'slow';
};

const ICON: Record<Kind, string> = {
  ok: '✅',
  slow: '🟡',
  wrong: '❌',
  timeout: '⏰',
};

const formatPoints = (n: number): string =>
  Number.isInteger(n) ? n.toString() : n.toFixed(1);

export const ResultsScreen = ({ result, onReplay, onHome }: Props) => {
  const { points, max } = totalScore(result.answers, {
    durationPerQuestionMs: result.durationPerQuestionMs,
    partialCreditFactor: result.partialCreditFactor,
  });
  const targetSeconds = (result.durationPerQuestionMs / 1000).toFixed(0);

  return (
    <div className="results">
      <header className="results__header">
        <h2>Bilan</h2>
        <div className="results__score">
          {formatPoints(points)} / {max}
        </div>
      </header>

      <p className="results__legend">
        Cible : {targetSeconds}s — réponse plus lente :{' '}
        {formatPoints(result.partialCreditFactor)} pt
      </p>

      <ul className="results__list">
        {result.answers.map((record, i) => {
          const kind = classify(record, result.durationPerQuestionMs);
          const elapsed = (record.elapsedMs / 1000).toFixed(1);
          return (
            <li key={i} className={`results__row results__row--${kind}`}>
              <span className="results__icon" aria-hidden>
                {ICON[kind]}
              </span>
              <span className="results__operation">{renderOperation(record)}</span>
              <span className="results__detail">
                {kind === 'ok' && <>{elapsed}s</>}
                {kind === 'slow' && <>{elapsed}s · trop lent</>}
                {kind === 'wrong' && (
                  <>
                    {elapsed}s · réponse : {record.given}
                  </>
                )}
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
