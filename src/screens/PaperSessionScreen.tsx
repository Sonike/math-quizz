import { useEffect, useMemo, useRef, useState } from 'react';
import { generateQuestions } from '../domain/question';
import type { Question } from '../domain/question';
import type { AnswerRecord, Settings, SessionResult } from '../domain/session';
import { QuestionCard } from '../components/QuestionCard';
import { Countdown } from '../components/Countdown';
import './PaperSessionScreen.css';

type Props = {
  settings: Settings;
  onComplete: (result: SessionResult) => void;
};

type Phase = { kind: 'leadin' } | { kind: 'question'; index: number };

const LeadIn = ({ onDone }: { onDone: () => void }) => {
  const [n, setN] = useState(3);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    // Individual timeouts created up-front so vi.advanceTimersByTime fires them all.
    const t1 = setTimeout(() => setN(2), 1000);
    const t2 = setTimeout(() => setN(1), 2000);
    const t3 = setTimeout(() => { onDoneRef.current(); }, 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="paper-session paper-session--leadin">
      <p className="paper-session__ready">Prêt ?</p>
      <p className="paper-session__leadin-number">{n}</p>
    </div>
  );
};

export const PaperSessionScreen = ({ settings, onComplete }: Props) => {
  const questions = useMemo<Question[]>(() => generateQuestions(settings), [settings]);
  const [phase, setPhase] = useState<Phase>({ kind: 'leadin' });
  const startedAtRef = useRef<string>(new Date().toISOString());
  const completedRef = useRef(false);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    const answers: AnswerRecord[] = questions.map((question) => ({
      question,
      given: null,
      elapsedMs: 0,
    }));
    onComplete({
      startedAt: startedAtRef.current,
      durationPerQuestionMs: settings.durationPerQuestionMs,
      partialCreditFactor: settings.partialCreditFactor,
      questionCount: settings.questionCount,
      selectedTables: [...settings.selectedTables],
      mode: settings.mode,
      answerMode: 'paper',
      answers,
    });
  };

  const advance = (current: number) => {
    if (current + 1 >= questions.length) {
      finish();
    } else {
      setPhase({ kind: 'question', index: current + 1 });
    }
  };

  if (phase.kind === 'leadin') {
    return <LeadIn onDone={() => setPhase({ kind: 'question', index: 0 })} />;
  }

  const current = questions[phase.index];
  return (
    <div className="paper-session">
      <div className="paper-session__counter">
        Question {phase.index + 1} / {questions.length}
      </div>
      <QuestionCard question={current} given="" />
      <Countdown
        durationMs={settings.durationPerQuestionMs}
        resetKey={phase.index}
        onElapsed={() => advance(phase.index)}
      />
    </div>
  );
};
