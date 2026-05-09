import { useEffect, useMemo, useRef, useState } from 'react';
import { generateQuestions } from '../domain/question';
import type { Question } from '../domain/question';
import type { AnswerRecord, Settings, SessionResult } from '../domain/session';
import { NumPad } from '../components/NumPad';
import { Timer } from '../components/Timer';
import { QuestionCard } from '../components/QuestionCard';
import { useNumericKeyboard } from '../hooks/useNumericKeyboard';
import './SessionScreen.css';

type Props = {
  settings: Settings;
  onComplete: (result: SessionResult) => void;
};

export const SessionScreen = ({ settings, onComplete }: Props) => {
  const questions = useMemo<Question[]>(() => generateQuestions(settings), [settings]);
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState<string>('');
  const startedAtRef = useRef<string>(new Date().toISOString());
  const questionStartRef = useRef<number>(performance.now());
  const answersRef = useRef<AnswerRecord[]>([]);
  const completedRef = useRef<boolean>(false);

  const finishIfDone = (recordsSoFar: AnswerRecord[]) => {
    if (recordsSoFar.length < questions.length || completedRef.current) return;
    completedRef.current = true;
    onComplete({
      startedAt: startedAtRef.current,
      durationPerQuestionMs: settings.durationPerQuestionMs,
      questionCount: settings.questionCount,
      selectedTables: [...settings.selectedTables],
      mode: settings.mode,
      answers: recordsSoFar,
    });
  };

  const submit = (value: number | null) => {
    if (completedRef.current) return;
    const record: AnswerRecord = {
      question: questions[index],
      given: value,
      elapsedMs: performance.now() - questionStartRef.current,
    };
    const next = [...answersRef.current, record];
    answersRef.current = next;
    setGiven('');
    if (next.length >= questions.length) {
      finishIfDone(next);
      return;
    }
    questionStartRef.current = performance.now();
    setIndex(next.length);
  };

  const handleDigit = (d: number) => {
    setGiven((prev) => (prev.length >= 4 ? prev : prev + String(d)));
  };

  const handleErase = () => setGiven((prev) => prev.slice(0, -1));

  const handleValidate = () => {
    if (given === '') return;
    submit(Number(given));
  };

  const handleTimeout = () => submit(null);

  useNumericKeyboard({
    onDigit: handleDigit,
    onErase: handleErase,
    onValidate: handleValidate,
    enabled: !completedRef.current,
  });

  // Reset given on question change (covers programmatic submit paths)
  useEffect(() => {
    setGiven('');
  }, [index]);

  const current = questions[index];
  return (
    <div className="session">
      <div className="session__top">
        <div className="session__counter">
          Question {index + 1} / {questions.length}
        </div>
        <Timer
          durationMs={settings.durationPerQuestionMs}
          resetKey={index}
          onTimeout={handleTimeout}
        />
      </div>
      <QuestionCard question={current} given={given} />
      <NumPad
        onDigit={handleDigit}
        onErase={handleErase}
        onValidate={handleValidate}
      />
    </div>
  );
};
