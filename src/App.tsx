import { useEffect, useState } from 'react';
import { LanguageProvider } from './i18n/I18nContext';
import { HomeScreen } from './screens/HomeScreen';
import { SessionScreen } from './screens/SessionScreen';
import { PaperSessionScreen } from './screens/PaperSessionScreen';
import { TrainingScreen } from './screens/TrainingScreen';
import { ExerciseListScreen } from './screens/ExerciseListScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { InfoScreen } from './screens/InfoScreen';
import type { SessionResult, Settings } from './domain/session';
import {
  loadSettings,
  saveSettings,
  recordSession,
  recordTrainingSession,
  clearAll,
} from './storage/profileStore';

type Screen = 'home' | 'session' | 'results' | 'settings' | 'progress' | 'info';

export const App = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const handleSessionComplete = (result: SessionResult) => {
    if (result.answerMode === 'paper') {
      // Paper sessions are recorded later, once the child has self-marked.
    } else if (result.answerMode === 'training') {
      recordTrainingSession(result);
    } else {
      recordSession(result);
    }
    setLastResult(result);
    setScreen('results');
  };

  const handleSaveResult = (final: SessionResult) => {
    recordSession(final);
    setLastResult(final);
  };

  return (
    <LanguageProvider lang={settings.language}>
      <div className="app">
        {screen === 'home' && (
          <HomeScreen
            settings={settings}
            onChange={setSettings}
            onStart={() => setScreen('session')}
            onOpenSettings={() => setScreen('settings')}
            onOpenProgress={() => setScreen('progress')}
            onOpenInfo={() => setScreen('info')}
          />
        )}
        {screen === 'session' &&
          (settings.answerMode === 'list' ? (
            <ExerciseListScreen
              settings={settings}
              onCancel={() => setScreen('home')}
            />
          ) : settings.answerMode === 'paper' ? (
            <PaperSessionScreen
              settings={settings}
              onComplete={handleSessionComplete}
              onCancel={() => setScreen('home')}
            />
          ) : settings.answerMode === 'training' ? (
            <TrainingScreen
              settings={settings}
              onComplete={handleSessionComplete}
              onCancel={() => setScreen('home')}
            />
          ) : (
            <SessionScreen
              settings={settings}
              onComplete={handleSessionComplete}
              onCancel={() => setScreen('home')}
            />
          ))}
        {screen === 'results' && lastResult && (
          <ResultsScreen
            result={lastResult}
            onReplay={() => setScreen('session')}
            onHome={() => setScreen('home')}
            onSave={handleSaveResult}
          />
        )}
        {screen === 'settings' && (
          <SettingsScreen
            settings={settings}
            onSave={setSettings}
            onClearHistory={clearAll}
            onBack={() => setScreen('home')}
          />
        )}
        {screen === 'progress' && (
          <ProgressScreen onBack={() => setScreen('home')} />
        )}
        {screen === 'info' && (
          <InfoScreen
            version={__APP_VERSION__}
            onBack={() => setScreen('home')}
          />
        )}
      </div>
    </LanguageProvider>
  );
};
