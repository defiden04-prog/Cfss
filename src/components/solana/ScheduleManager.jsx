import React, { useState, useEffect } from 'react';
import { useWallet } from './WalletProvider';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { addDays, addWeeks, addMonths, format, formatDistanceToNow } from 'date-fns';
import {
  Clock, Bell, BellOff, Zap, Calendar, Mail, CheckCircle2,
  Loader2, Activity, RefreshCw, Inbox
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import SolanaLogo from './SolanaLogo';
import { motion, AnimatePresence } from 'framer-motion';

const FREQ_OPTIONS = [
  { value: 'daily',   label: 'daily',   desc: 'every 24h', icon: '⚡' },
  { value: 'weekly',  label: 'weekly',  desc: 'every 7d',  icon: '📅' },
  { value: 'monthly', label: 'monthly', desc: 'every 30d', icon: '🗓' },
];

function getNextRun(frequency) {
  const now = new Date();
  if (frequency === 'daily')   return addDays(now, 1).toISOString();
  if (frequency === 'weekly')  return addWeeks(now, 1).toISOString();
  if (frequency === 'monthly') return addMonths(now, 1).toISOString();
  return addWeeks(now, 1).toISOString();
}

export default function ScheduleManager() {
  const { connected, publicKey } = useWallet();
  const [schedule, setSchedule] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [enabled, setEnabled] = useState(false);
  const [tab, setTab] = useState('schedule');

  useEffect(() => {
    if (connected && publicKey) loadData();
  }, [connected, publicKey]);

  const loadData = async () => {
    setLoading(true);
    const wallet = publicKey.toString();
    const [sRes, nRes] = await Promise.all([
      supabase.from('ScanSchedule').select('*').eq('wallet_address', wallet),
      supabase.from('ScanNotification').select('*').eq('wallet_address', wallet),
    ]);
    const schedules = sRes.data || [];
    const notifs = nRes.data || [];
    if (schedules.length > 0) {
      const s = schedules[0];
      setSchedule(s);
      setFrequency(s.frequency || 'weekly');
      setEnabled(s.enabled || false);
      setEmail(s.notify_email || '');
    }
    setNotifications(notifs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setLoading(false);
  };

  const saveSchedule = async () => {
    setSaving(true);
    const wallet = publicKey.toString();
    const nextRun = getNextRun(frequency);
    const payload = {
      wallet_address: wallet,
      enabled,
      frequency,
      notify_email: email,
      next_run: enabled ? nextRun : null,
    };
    try {
      let saved;
      if (schedule) {
        const { data: updated } = await supabase.from('ScanSchedule').update(payload).eq('id', schedule.id).select();
        saved = updated?.[0];
        setSchedule({ ...schedule, ...payload });
      } else {
        const { data: created } = await supabase.from('ScanSchedule').insert([payload]).select();
        saved = created?.[0];
        setSchedule(saved);
      }

      // Create a confirmation notification
      if (enabled) {
        const { data: notifData } = await supabase.from('ScanNotification').insert([{
          wallet_address: wallet,
          type: 'info',
          title: 'auto_scan_scheduled',
          message: `Auto-scan set to ${frequency}. Next run: ${format(new Date(nextRun), 'MMM d, yyyy HH:mm')}`,
          sol_amount: 0,
          read: false,
        }]).select();
        const notif = notifData?.[0];
        if (notif) setNotifications(prev => [notif, ...prev]);
      }
      toast.success(enabled ? `Auto-scan enabled — ${frequency}` : 'Auto-scan disabled');
    } catch (err) {
      toast.error('Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => supabase.from('ScanNotification').update({ read: true }).eq('id', n.id)));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const notifIcon = (type) => {
    if (type === 'claim_complete') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (type === 'scan_complete') return <Activity className="w-4 h-4 text-cyan-400" />;
    if (type === 'schedule_reminder') return <Calendar className="w-4 h-4 text-yellow-400" />;
    return <Bell className="w-4 h-4 text-slate-500" />;
  };

  if (!connected) {
    return (
      <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-12 text-center">
        <Clock className="w-10 h-10 text-emerald-500/20 mx-auto mb-3" />
        <p className="text-slate-500 text-sm font-mono">// connect wallet to manage schedule</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-emerald-500/50 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>

      {/* Tab bar */}
      <div className="flex bg-black/60 border border-emerald-500/20 rounded-lg p-0.5">
        {[
          { id: 'schedule', label: 'schedule', icon: Clock },
          { id: 'notifications', label: `inbox${unreadCount > 0 ? ` [${unreadCount}]` : ''}`, icon: Inbox },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs rounded-md transition-all ${
              tab === id ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-600 hover:text-slate-400'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'schedule' && (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Enable toggle */}
            <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-400 font-mono">auto_scan</p>
                <p className="text-[10px] text-slate-600 mt-0.5">automatically scan & claim on schedule</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>

            {/* Frequency picker */}
            <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-5">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">scan_frequency</p>
              <div className="grid grid-cols-3 gap-3">
                {FREQ_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFrequency(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-lg border transition-all ${
                      frequency === opt.value
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : 'bg-black/40 border-emerald-500/10 text-slate-500 hover:border-emerald-500/30'
                    }`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span className="text-xs font-mono">{opt.label}</span>
                    <span className="text-[10px] text-slate-600">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Email for notifications */}
            <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-5">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Mail className="w-3 h-3" />
                email_notifications (optional)
              </p>
              <Input
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-black/60 border-emerald-500/20 text-emerald-400 placeholder:text-slate-700 font-mono text-sm focus:border-emerald-500/40"
              />
              <p className="text-[10px] text-slate-700 mt-2">// receive SOL recovery summaries after each cycle</p>
            </div>

            {/* Next run info */}
            {enabled && schedule?.next_run && (
              <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                <RefreshCw className="w-4 h-4 text-emerald-400/60 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">next_scheduled_scan</p>
                  <p className="text-xs text-emerald-400 mt-0.5">
                    {format(new Date(schedule.next_run), 'MMM d, yyyy HH:mm')}
                    <span className="text-slate-600 ml-2">({formatDistanceToNow(new Date(schedule.next_run), { addSuffix: true })})</span>
                  </p>
                </div>
              </div>
            )}

            {/* Stats */}
            {schedule && (schedule.auto_claim_count > 0 || schedule.total_auto_claimed > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-4">
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">cycles_run</p>
                  <p className="text-2xl text-emerald-400">{schedule.auto_claim_count || 0}</p>
                </div>
                <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-4">
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">auto_claimed</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <SolanaLogo className="w-4 h-4 text-emerald-400" />
                    <p className="text-2xl text-emerald-400">{(schedule.total_auto_claimed || 0).toFixed(4)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Save */}
            <button
              onClick={saveSchedule}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm font-mono transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {saving ? 'saving...' : 'save_schedule'}
            </button>

            {/* Info notice */}
            <div className="px-4 py-3 bg-yellow-500/5 border border-yellow-500/15 rounded-lg">
              <p className="text-[10px] text-yellow-500/60 font-mono leading-relaxed">
                // auto_scan requires your wallet to be connected at scan time.<br />
                // notifications are stored in inbox and emailed if configured.<br />
                // schedule is saved — you'll be reminded when it's time.
              </p>
            </div>
          </motion.div>
        )}

        {tab === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-emerald-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-400/50" />
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest">notification_inbox</p>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-slate-600 hover:text-emerald-400 transition-colors"
                  >
                    [mark_all_read]
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-16">
                  <BellOff className="w-8 h-8 text-slate-800 mx-auto mb-3" />
                  <p className="text-slate-600 text-xs">// no notifications yet</p>
                  <p className="text-[10px] text-slate-700 mt-1">enable auto-scan to receive summaries</p>
                </div>
              ) : (
                <div className="divide-y divide-emerald-500/5 max-h-[500px] overflow-y-auto">
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`px-5 py-4 transition-all ${!notif.read ? 'bg-emerald-500/5' : 'hover:bg-emerald-500/5'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">{notifIcon(notif.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className={`text-xs font-mono ${notif.read ? 'text-slate-500' : 'text-emerald-400'}`}>
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-600 leading-relaxed">{notif.message}</p>
                          {notif.sol_amount > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <SolanaLogo className="w-3 h-3 text-emerald-400/60" />
                              <span className="text-xs text-emerald-400">+{notif.sol_amount.toFixed(4)} SOL</span>
                            </div>
                          )}
                          <p className="text-[10px] text-slate-700 mt-1">
                            {notif.created_date
                              ? formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })
                              : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
