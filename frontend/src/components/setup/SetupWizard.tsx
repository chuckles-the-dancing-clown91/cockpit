import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Card } from '../ui/Card';
import { Loader2, Check, Copy, Key, Settings, Rocket } from 'lucide-react';
import { toast } from 'sonner';

interface SetupConfig {
  master_key: string;
  newsdata_api_key?: string;
  log_level?: string;
}

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [masterKey, setMasterKey] = useState('');
  const [newsDataKey, setNewsDataKey] = useState('');
  const [logLevel, setLogLevel] = useState('info');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const totalSteps = 4;

  const generateKey = async () => {
    setIsGenerating(true);
    try {
      const key = await invoke<string>('generate_master_key_command');
      setMasterKey(key);
      toast.success('Master Key Generated', {
        description: 'A secure 256-bit encryption key has been created.',
      });
    } catch (error) {
      toast.error('Generation Failed', {
        description: error as string,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(masterKey);
      setCopied(true);
      toast.success('Copied to Clipboard', {
        description: 'Master key copied successfully.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Copy Failed', {
        description: 'Could not copy to clipboard.',
      });
    }
  };

  const saveConfiguration = async () => {
    if (!masterKey || masterKey.length !== 64) {
      toast.error('Invalid Master Key', {
        description: 'Master key must be exactly 64 hexadecimal characters.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const config: SetupConfig = {
        master_key: masterKey,
        newsdata_api_key: newsDataKey || undefined,
        log_level: logLevel,
      };

      await invoke('save_setup_config_command', { config });
      
      toast.success('Setup Complete!', {
        description: 'Cockpit has been configured successfully.',
      });
      
      // Give user a moment to see the success message
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      toast.error('Setup Failed', {
        description: error as string,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const nextStep = () => {
    if (step === 2 && !masterKey) {
      toast.error('Master Key Required', {
        description: 'Please generate a master key before continuing.',
      });
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900/50 backdrop-blur border border-purple-500/20 rounded-lg shadow-2xl">
        <div className="p-6 space-y-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Rocket className="w-8 h-8 text-purple-400" />
              Welcome to Cockpit
            </h1>
            <span className="text-sm text-slate-400">
              Step {step} of {totalSteps}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Rocket className="w-10 h-10 text-purple-400" />
                </div>
                <h2 className="text-2xl font-semibold text-white">Let's get started!</h2>
                <p className="text-slate-300 text-lg max-w-md mx-auto">
                  Cockpit is a modern productivity suite for content creators, researchers, and digital architects.
                </p>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <p className="text-slate-200">
                  This wizard will help you configure Cockpit for first-time use. It only takes a minute!
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-white">What we'll set up:</h3>
                <ul className="space-y-2 text-slate-300">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-400 mt-0.5" />
                    <span>Generate a secure master encryption key</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-400 mt-0.5" />
                    <span>Configure optional API keys (NewsData)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-400 mt-0.5" />
                    <span>Set logging preferences</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-400 mt-0.5" />
                    <span>Initialize your workspace</span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={nextStep}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                Begin Setup
              </Button>
            </div>
          )}

          {/* Step 2: Master Key Generation */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Key className="w-6 h-6 text-purple-400" />
                  <h2 className="text-xl font-semibold text-white">Master Encryption Key</h2>
                </div>
                <p className="text-slate-300">
                  This key encrypts sensitive data like API keys in your database. Keep it secure!
                </p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-slate-200">
                  <strong className="text-yellow-400">Important:</strong> This key will be stored in ~/.cockpit/.env. 
                  If you lose it, you'll need to re-enter all API keys.
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={generateKey}
                  disabled={isGenerating || !!masterKey}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : masterKey ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Key Generated
                    </>
                  ) : (
                    'Generate Secure Key'
                  )}
                </Button>

                {masterKey && (
                  <div className="space-y-2">
                    <Label className="text-slate-200">Your Master Key</Label>
                    <div className="relative">
                      <Input
                        value={masterKey}
                        readOnly
                        className="font-mono text-xs bg-slate-800 border-slate-700 text-slate-200 pr-20"
                      />
                      <Button
                        onClick={copyToClipboard}
                        size="sm"
                        variant="ghost"
                        className="absolute right-1 top-1 h-8"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400">
                      256-bit encryption key (64 hexadecimal characters)
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button onClick={prevStep} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={nextStep}
                  disabled={!masterKey}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Optional API Keys */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Settings className="w-6 h-6 text-purple-400" />
                  <h2 className="text-xl font-semibold text-white">API Configuration</h2>
                </div>
                <p className="text-slate-300">
                  Configure optional integrations. You can skip this and add them later in Settings.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newsdata" className="text-slate-200">
                    NewsData.io API Key <span className="text-slate-500">(Optional)</span>
                  </Label>
                  <Input
                    id="newsdata"
                    type="password"
                    value={newsDataKey}
                    onChange={(e) => setNewsDataKey(e.target.value)}
                    placeholder="pub_xxxxxxxxxxxxx"
                    className="bg-slate-800 border-slate-700 text-slate-200"
                  />
                  <p className="text-xs text-slate-400">
                    For news aggregation. Get one free at{' '}
                    <a href="https://newsdata.io" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                      newsdata.io
                    </a>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logLevel" className="text-slate-200">
                    Logging Level
                  </Label>
                  <select
                    id="logLevel"
                    value={logLevel}
                    onChange={(e) => setLogLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-200"
                  >
                    <option value="error">Error (Errors only)</option>
                    <option value="warn">Warn (Warnings and errors)</option>
                    <option value="info">Info (Recommended)</option>
                    <option value="debug">Debug (Verbose)</option>
                  </select>
                  <p className="text-xs text-slate-400">
                    Controls how much detail appears in logs. Info is recommended for most users.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={prevStep} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={nextStep} className="flex-1 bg-purple-600 hover:bg-purple-700">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-semibold text-white">Ready to Launch!</h2>
                <p className="text-slate-300 text-lg max-w-md mx-auto">
                  Everything is configured. Click below to complete setup and start using Cockpit.
                </p>
              </div>

              <div className="space-y-3 bg-slate-800/50 rounded-lg p-4">
                <h3 className="font-semibold text-white">Configuration Summary:</h3>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex justify-between">
                    <span>Master Key:</span>
                    <span className="text-green-400">✓ Generated</span>
                  </li>
                  <li className="flex justify-between">
                    <span>NewsData API:</span>
                    <span className={newsDataKey ? 'text-green-400' : 'text-slate-500'}>
                      {newsDataKey ? '✓ Configured' : 'Not configured'}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Log Level:</span>
                    <span className="text-purple-400">{logLevel.toUpperCase()}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Data Directory:</span>
                    <span className="text-slate-400">~/.cockpit</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button onClick={prevStep} variant="outline" className="flex-1" disabled={isSaving}>
                  Back
                </Button>
                <Button
                  onClick={saveConfiguration}
                  disabled={isSaving}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
