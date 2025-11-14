import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ENDPOINTS } from "@/config/api";

interface MedItem {
  name: string;
  dose?: string;
  timesPerDay: number;
}

interface ScheduledPrescription {
  id: string;
  patientName?: string;
  prescribedDate?: string;
  meds: MedItem[];
  createdAt: string;
}

const STORAGE_KEY = "feverease.prescriptions";

function simpleParsePrescription(text: string) {
  // Very naive parser: find lines with "Name:" / "Date:" and lines that look like medicines
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let patientName: string | undefined;
  let prescribedDate: string | undefined;
  const meds: MedItem[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (!patientName && (lower.startsWith("name:") || lower.startsWith("patient:"))) {
      patientName = line.split(":").slice(1).join(":").trim();
      continue;
    }
    if (!prescribedDate && (lower.startsWith("date:") || /\d{4}-\d{2}-\d{2}/.test(line) || /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line))) {
      // try to extract a date-like token
      const m = line.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{2,4})/);
      prescribedDate = m ? m[0] : line.split(":").slice(1).join(":").trim();
      continue;
    }

    // medicines: look for words and a frequency like '2 times a day' or 'twice daily' or '1x/day'
    const freqMatch = line.match(/(\d+)\s*(times|x|x\/day|per day|/i); // intentionally simple
    // We'll fallback to searching for 'daily' / 'twice' etc
    let timesPerDay = 1;
    const tp = line.match(/(\d+)\s*(times|x|per|per day)/i);
    if (tp) timesPerDay = parseInt(tp[1], 10) || 1;
    else if (/twice|bid|2x/i.test(line)) timesPerDay = 2;
    else if (/thrice|tid|3x/i.test(line)) timesPerDay = 3;

    // if line contains a letter and numbers, assume it's a medicine
    if (/[a-zA-Z]/.test(line) && /\d|mg|ml|tablet|tab|capsule|cap/i.test(line)) {
      // Extract name before a dash or comma
      const parts = line.split(/-|,|:/).map(p => p.trim()).filter(Boolean);
      const name = parts[0];
      // attempt to find dose token
      const doseMatch = line.match(/(\d+\s*(mg|ml|g))/i);
      meds.push({ name: name || line, dose: doseMatch ? doseMatch[0] : undefined, timesPerDay });
      continue;
    }
  }

  // If nothing parsed as meds, try to parse lines that look like 'Paracetamol 500mg 2x/day'
  if (meds.length === 0) {
    for (const line of lines) {
      const m = line.match(/([A-Za-z\s]+)\s+(\d+\s*(mg|ml|g))\s*(\d)\s*x?/i);
      if (m) {
        meds.push({ name: m[1].trim(), dose: m[2].trim(), timesPerDay: parseInt(m[4], 10) || 1 });
      }
    }
  }

  return { patientName, prescribedDate, meds };
}

export default function FollowDoses() {
  const [raw, setRaw] = useState("");
  const [patientName, setPatientName] = useState("");
  const [prescribedDate, setPrescribedDate] = useState("");
  const [meds, setMeds] = useState<MedItem[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledPrescription[]>([]);
  const timersRef = useRef<Record<string, number[]>>({});
  const { toast } = useToast();

  useEffect(() => {
    // load scheduled from storage
    const rawStore = localStorage.getItem(STORAGE_KEY);
    if (rawStore) {
      try {
        const parsed: ScheduledPrescription[] = JSON.parse(rawStore);
        setScheduled(parsed);
        // reschedule timers
        for (const item of parsed) scheduleForItem(item);
      } catch (e) {
        console.error(e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(items: ScheduledPrescription[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    setScheduled(items);
  }

  function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function scheduleForItem(item: ScheduledPrescription) {
    requestNotificationPermission();
    const ids: number[] = [];
    const now = Date.now();
    for (const med of item.meds) {
      const interval = Math.floor((24 * 60 * 60 * 1000) / Math.max(1, med.timesPerDay));
      // schedule next N occurrences (one per timesPerDay) starting from now
      for (let i = 0; i < med.timesPerDay; i++) {
        const target = now + (i + 1) * 60 * 1000 + i * 1000; // small offsets within next minutes for demo
        const delay = Math.max(0, target - Date.now());
        const tid = window.setTimeout(() => {
          // show notification
          if (Notification.permission === 'granted') {
            new Notification(`Medicine Reminder`, { body: `${med.name} — ${med.dose ?? ''} (${med.timesPerDay}x/day)` });
          }
          toast({ title: 'Reminder', description: `Take ${med.name}${med.dose ? ` (${med.dose})` : ''}` });
          // also set repeating daily reminder
          const dailyId = window.setInterval(() => {
            if (Notification.permission === 'granted') {
              new Notification(`Medicine Reminder`, { body: `${med.name} — ${med.dose ?? ''} (${med.timesPerDay}x/day)` });
            }
            toast({ title: 'Reminder', description: `Take ${med.name}${med.dose ? ` (${med.dose})` : ''}` });
          }, 24 * 60 * 60 * 1000);
          ids.push(dailyId);
        }, delay);
        ids.push(tid);
      }
    }
    timersRef.current[item.id] = ids;
  }

  function clearTimersForItem(id: string) {
    const arr = timersRef.current[id] || [];
    for (const t of arr) {
      try { clearTimeout(t); clearInterval(t); } catch (e) {}
    }
    delete timersRef.current[id];
  }

  function handleParse() {
    const parsed = simpleParsePrescription(raw);
    setPatientName(parsed.patientName || '');
    setPrescribedDate(parsed.prescribedDate || '');
    setMeds(parsed.meds.length ? parsed.meds : [{ name: '', dose: '', timesPerDay: 1 }]);
    toast({ title: 'Parsed', description: 'Parsed prescription — review before scheduling.' });
  }

  async function handleParseWithAI() {
    if (!raw.trim()) { toast({ title: 'Empty', description: 'Paste prescription text first.' }); return; }
    try {
      const prompt = `Extract the patient name, prescribed date, and a list of medicines from the following prescription text. For each medicine return name, dose (if present) and times per day (as a number). Respond with JSON like {\"patientName\":..., \"prescribedDate\":..., \"meds\":[{\"name\":...,\"dose\":...,\"timesPerDay\":...}] }\n\nPrescription:\n${raw}`;
      const res = await fetch(ENDPOINTS.CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, history: [] }),
      });
      if (!res.ok) throw new Error('AI parse failed');
      const data = await res.json();
      // the chat endpoint returns { response: string }
      const text = data.response || data;
      // Attempt to extract JSON from the response
      const jsonMatch = typeof text === 'string' ? text.match(/\{[\s\S]*\}/) : null;
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setPatientName(parsed.patientName || '');
        setPrescribedDate(parsed.prescribedDate || '');
        if (Array.isArray(parsed.meds) && parsed.meds.length) setMeds(parsed.meds.map((m: any) => ({ name: m.name || '', dose: m.dose || '', timesPerDay: Number(m.timesPerDay) || 1 })));
        toast({ title: 'AI Parsed', description: 'Parsed prescription using AI. Please verify.' });
      } else {
        toast({ title: 'Parse failed', description: 'Could not extract structured JSON from AI response.' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'AI parsing failed.' });
    }
  }

  function handleSchedule() {
    if (!meds.length) { toast({ title: 'No medicines', description: 'Add at least one medicine.' }); return; }
    const item: ScheduledPrescription = {
      id: Date.now().toString(),
      patientName: patientName || undefined,
      prescribedDate: prescribedDate || undefined,
      meds,
      createdAt: new Date().toISOString(),
    };
    const next = [...scheduled, item];
    persist(next);
    scheduleForItem(item);
    toast({ title: 'Scheduled', description: 'Reminders scheduled (while app is open).' });
  }

  function handleCancel(id: string) {
    clearTimersForItem(id);
    const next = scheduled.filter(s => s.id !== id);
    persist(next);
    toast({ title: 'Cancelled', description: 'Reminder cancelled.' });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Follow & Doses — Prescription Reader</h1>

        <Card className="p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Paste prescription text</label>
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} className="w-full min-h-[120px] p-2 border rounded" placeholder="Paste prescription or doctor's notes here..." />
          <div className="flex gap-2 mt-3">
            <Button onClick={handleParse}>Parse Prescription</Button>
            <Button variant="secondary" onClick={() => { setRaw(''); setPatientName(''); setPrescribedDate(''); setMeds([]); }}>Clear</Button>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-2">Parsed Details (edit if needed)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Patient Name</label>
              <input className="w-full p-2 border rounded mt-1" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Prescribed Date</label>
              <input className="w-full p-2 border rounded mt-1" value={prescribedDate} onChange={(e) => setPrescribedDate(e.target.value)} placeholder={format(new Date(), 'yyyy-MM-dd')} />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {meds.map((m, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input className="flex-1 p-2 border rounded" value={m.name} onChange={(e) => setMeds(prev => prev.map((x,i)=> i===idx? {...x, name: e.target.value}: x))} placeholder="Medicine name" />
                <input className="w-36 p-2 border rounded" value={m.dose} onChange={(e) => setMeds(prev => prev.map((x,i)=> i===idx? {...x, dose: e.target.value}: x))} placeholder="Dose (e.g. 500mg)" />
                <input type="number" min={1} className="w-28 p-2 border rounded" value={m.timesPerDay} onChange={(e) => setMeds(prev => prev.map((x,i)=> i===idx? {...x, timesPerDay: parseInt(e.target.value || '1',10)}: x))} />
              </div>
            ))}
            <div>
              <Button variant="ghost" onClick={() => setMeds(prev => [...prev, { name: '', dose: '', timesPerDay: 1 }])}>Add medicine</Button>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={handleSchedule}>Schedule Reminders</Button>
            <Button variant="secondary" onClick={() => { setMeds([]); }}>Reset Medicines</Button>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Scheduled Prescriptions</h3>
          <div className="space-y-3">
            {scheduled.length === 0 && <p className="text-sm text-slate-600">No schedules yet.</p>}
            {scheduled.map(item => (
              <div key={item.id} className="p-3 border rounded flex justify-between items-center">
                <div>
                  <div className="font-semibold">{item.patientName || 'Unnamed patient'}</div>
                  <div className="text-sm text-slate-600">Prescribed: {item.prescribedDate || '—'}</div>
                  <div className="text-sm mt-1">
                    {item.meds.map(m => (<div key={m.name}>{m.name} {m.dose ? `• ${m.dose}` : ''} — {m.timesPerDay}x/day</div>))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-xs text-slate-500">Created {format(new Date(item.createdAt), 'PP p')}</div>
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={() => handleCancel(item.id)}>Cancel</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
