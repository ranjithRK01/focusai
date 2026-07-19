import { useState, useEffect } from 'react';
import { StorageService } from '@/lib/storage';
import type { Settings } from '@/types';

function App() {
  const [settings, setSettingsState] = useState<Settings | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const data = await StorageService.getSettings();
      setSettingsState(data);
    };
    loadSettings();
  }, []);

  const updateSetting = async (key: keyof Settings, value: any) => {
    if (!settings) return;
    const newSettings = { ...settings, [key]: value };
    setSettingsState(newSettings);
    await StorageService.setSettings(newSettings);
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Settings</h1>

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-800">Notifications</h3>
              <p className="text-sm text-gray-500">Receive focus reminders</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enableNotifications}
              onChange={(e) => updateSetting('enableNotifications', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-800">Nudges</h3>
              <p className="text-sm text-gray-500">Warn about distracting videos</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enableNudges}
              onChange={(e) => updateSetting('enableNudges', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-800">Timer</h3>
              <p className="text-sm text-gray-500">Enable 5-minute timer option</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enableTimer}
              onChange={(e) => updateSetting('enableTimer', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-800">Auto Close</h3>
              <p className="text-sm text-gray-500">Close tab when timer expires</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoClose}
              onChange={(e) => updateSetting('autoClose', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-800">Dark Mode</h3>
              <p className="text-sm text-gray-500">Use dark theme</p>
            </div>
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={(e) => updateSetting('darkMode', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div>
            <h3 className="font-medium text-gray-800 mb-2">Sync Interval</h3>
            <p className="text-sm text-gray-500 mb-2">Seconds between progress updates</p>
            <input
              type="number"
              value={settings.syncInterval}
              onChange={(e) => updateSetting('syncInterval', parseInt(e.target.value))}
              min="5"
              max="60"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
