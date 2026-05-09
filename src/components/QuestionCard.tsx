import type { Question } from '../domain/question';
import './QuestionCard.css';

type Props = {
  question: Question;
  given: string;
};

const renderOperation = (q: Question): string => {
  if (q.op === 'mul') return `${q.a} × ${q.b}`;
  return `${q.a * q.b} ÷ ${q.a}`;
};

export const QuestionCard = ({ question, given }: Props) => (
  <div className="question-card">
    <div className="question-card__operation">
      {renderOperation(question)} <span className="question-card__equals">=</span>
    </div>
    <div className={`question-card__answer${given === '' ? ' question-card__answer--empty' : ''}`}>
      {given === '' ? '?' : given}
    </div>
  </div>
);
