import { useEffect, useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { SessionScreen } from './screens/SessionScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import type { SessionResult, Settings } from './domain/session';
import {
  loadSettings,
  saveSettings,
  recordSession,
  clearAll,
} from './storage/profileStore';

type Screen = 'home' | 'session' | 'results' | 'settings';

export const App = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const handleSessionComplete = (result: SessionResult) => {
    recordSession(result);
    setLastResult(result);
    setScreen('results');
  };

  return (
    <div className="app">
      {screen === 'home' && (
        <HomeScreen
          settings={settings}
          onChange={setSettings}
          onStart={() => setScreen('session')}
          onOpenSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'session' && (
        <SessionScreen settings={settings} onComplete={handleSessionComplete} />
      )}
      {screen === 'results' && lastResult && (
        <ResultsScreen
          result={lastResult}
          onReplay={() => setScreen('session')}
          onHome={() => setScreen('home')}
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
    </div>
  );
};
