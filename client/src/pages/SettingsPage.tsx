import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  User,
  DollarSign,
  Key,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Save,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../lib/api';
import type { UserProfileInput } from '@shared/schema';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CAD)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (AUD)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (JPY)' },
];

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => api.getProfile(),
  });

  const [formData, setFormData] = useState<Partial<UserProfileInput>>({
    full_name: '',
    email: '',
    currency: 'USD',
    monthly_income: 5000,
    family_size: 3,
    savings_target_pct: 25,
    primary_goal: 'Emergency Fund Build',
  });

  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name,
        email: profile.email,
        currency: profile.currency || 'USD',
        monthly_income: profile.monthly_income,
        family_size: profile.family_size,
        savings_target_pct: profile.savings_target_pct,
        primary_goal: profile.primary_goal,
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<UserProfileInput>) => api.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update profile');
    },
  });

  const resetDataMutation = useMutation({
    mutationFn: () => api.resetDemoData(),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 4000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to reset sample data');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const payload: Partial<UserProfileInput> = {
      ...formData,
      monthly_income: Number(formData.monthly_income),
      family_size: Number(formData.family_size),
      savings_target_pct: Number(formData.savings_target_pct),
    };

    if (geminiApiKeyInput.trim()) {
      payload.gemini_api_key = geminiApiKeyInput.trim();
    }

    updateProfileMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            System Preferences
          </span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
          Household Profile & Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage currency, income benchmarks, Google Gemini credentials, and database utilities
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-brand-400" />
          <span>Household settings successfully updated!</span>
        </div>
      )}

      {seedSuccess && (
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>Sample household data re-seeded with realistic transactions and recurring bills!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleProfileSubmit} className="space-y-6">
        {/* Household Profile Information */}
        <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <User className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Household Identity & Cashflow Targets
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Household Name / Identifier
              </label>
              <input
                type="text"
                required
                value={formData.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Notification Email
              </label>
              <input
                type="email"
                required
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Operating Currency
              </label>
              <select
                value={formData.currency || 'USD'}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Household Monthly Net Income ({formData.currency})
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={formData.monthly_income || 0}
                onChange={(e) => setFormData({ ...formData, monthly_income: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Gemini AI API Key Configuration */}
        <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyanBrand-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Google GenAI Credentials (@google/genai)
              </h3>
            </div>

            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                profile?.has_api_key
                  ? 'bg-brand-500/15 text-brand-400 border-brand-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
            >
              {profile?.has_api_key ? 'API Key Active (Gemini 2.5 Flash)' : 'Using Local Intelligent Auditor'}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            The system executes AI audits server-side using Google's <code>@google/genai</code> SDK and model <code>gemini-2.5-flash</code>. You can set the key below or via the <code>GEMINI_API_KEY</code> environment variable. When no key is set, the built-in intelligent heuristic engine handles audits seamlessly.
          </p>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Gemini API Key
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder={profile?.masked_api_key || 'Enter AI Studio Gemini API key (AIzaSy...)'}
                value={geminiApiKeyInput}
                onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-cyanBrand-500"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Never shared with client bundles. Processed strictly on the Express backend.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={updateProfileMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-emerald-400 text-white font-semibold text-sm shadow-glow-emerald transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>

      {/* Database Management & Testing Tools */}
      <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <Database className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Demo Environment & Sample Data
          </h3>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Need to test with pre-populated household data? Click below to reseed standard household envelopes (Groceries, Utilities, Rent, Subscriptions), recurring bills, and realistic recent transactions.
        </p>

        <button
          onClick={() => {
            if (confirm('Reseed database with fresh sample transactions and bills?')) {
              resetDataMutation.mutate();
            }
          }}
          disabled={resetDataMutation.isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${resetDataMutation.isPending ? 'animate-spin' : ''}`} />
          <span>Reset & Reseed Sample Household Data</span>
        </button>
      </div>
    </div>
  );
};
