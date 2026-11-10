import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { clipById, nas, PLAN_FEATURES, PLANS, TIER_RANK, type Tier } from '../data/demo';
import { useSession } from '../lib/state';
import { Page, StatusChip } from '../components/ui';

/** Entry: subscribers land straight in the tournament; everyone else meets the free-highlights landing. */
export function Home() {
  const { tier, ticker } = useSession();
  if (tier === 'free') return <Landing />;
  const live = ticker.find((b) => b.status === 'live');
  // No live broadcast: the recommended replay plays instead.
  return <Navigate to={`/watch/${live?.id ?? 'me-d6'}`} replace />;
}

const FREE = ['c-day5-hl', 'c-ivey-10', 'c-hellmuth-bluff'].map((id) => clipById(id)!);

/** [L] Landing — a taste first. NBA TV opens on a paywall; WSOP TV opens on free highlights and asks later. */
export function Landing() {
  const { ticker } = useSession();
  const live = ticker.filter((b) => b.status === 'live');
  return (
    <Page>
      <section className="relative overflow-hidden">
        <img src={nas('stills/vegas-ft-04.jpg')} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-bg" />
        <div className="relative px-4 py-16 text-center md:py-24">
          <h1 className="display text-[40px] md:text-[56px]">WSOP <span className="text-red">TV</span></h1>
          <p className="mt-1 text-[14px] text-muted">The World Series of Poker, streaming live</p>
          <a href="#free" className="btn btn-white mt-6 !h-10 !rounded-full !px-6">Watch free highlights</a>
          {live.length > 0 && (
            <div className="mx-auto mt-6 flex max-w-3xl flex-col gap-2 sm:flex-row sm:justify-center">
              {live.map((b) => (
                <Link key={b.id} to={`/watch/${b.id}`} className="flex items-center gap-2 rounded border border-line bg-black/60 px-3 py-2 text-left text-[12px] whitespace-nowrap hover:border-line-strong">
                  <StatusChip b={b} small />
                  <span className="font-semibold">{b.short}</span>
                  <span className="text-muted">{b.sub}</span>
                  <span className="ml-auto text-muted">Chip counts →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="free" className="scroll-mt-28 px-4 py-6 md:px-6">
        <h2 className="display mb-3 text-[15px]">Free highlights</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {FREE.map((c) => (
            <Link key={c.id} to={`/hands/${c.id}`} className="group block">
              <div className="relative aspect-video overflow-hidden rounded border border-line bg-surface">
                <img src={nas(c.still)} alt="" className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100" />
                <span className="absolute inset-0 m-auto grid h-12 w-12 place-items-center rounded-full bg-black/60 text-xl">▶</span>
                <span className="absolute right-1.5 bottom-1.5 rounded-sm bg-black/80 px-1.5 text-[11px]">{c.duration}</span>
              </div>
              <div className="mt-2 text-[13px] font-bold">{c.title}</div>
              <div className="text-[11px] text-subtle">{c.when}</div>
            </Link>
          ))}
        </div>
        <Link to="/hands" className="mt-3 inline-block text-[12px] text-muted hover:text-white">All highlights →</Link>
      </section>

      <section className="px-4 py-6 md:px-6">
        <h2 className="display mb-3 text-[15px]">Unlock with GGPass</h2>
        <PlanTable />
      </section>

      <section className="mt-4 bg-gradient-to-b from-[#1a1608] to-bg px-4 py-12 text-center">
        <div className="text-[22px] font-bold">Watch every table. One account.</div>
        <Link to="/subscribe" className="btn btn-gold mt-4 !h-10 !rounded-full !px-8">Subscribe via GGPass</Link>
        <div className="mt-2 text-[11px] text-subtle">Redirects to GGPass · Cancel anytime · Billed by WSOP+</div>
      </section>
    </Page>
  );
}

export function PlanTable({ pick, onPick }: { pick?: Tier; onPick?: (t: Tier) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-separate border-spacing-1 text-[12px]">
        <thead>
          <tr>
            <th />
            {PLANS.map((p) => (
              <th
                key={p.tier}
                onClick={() => onPick?.(p.tier)}
                className={`rounded border px-2 py-2.5 ${p.tier === 'platinum' ? 'border-gold/60 bg-gold-dim' : 'border-line bg-surface'} ${onPick ? 'cursor-pointer' : ''} ${pick === p.tier ? '!border-white' : ''}`}
              >
                <div className={`text-[10px] tracking-widest uppercase ${p.tier === 'platinum' ? 'text-gold' : 'text-muted'}`}>{p.name}</div>
                <div className="text-[16px] font-black">{p.price}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PLAN_FEATURES.map((f) => (
            <tr key={f.label}>
              <td className="py-1.5 pr-2 text-muted">{f.label}</td>
              {PLANS.map((p) => (
                <td key={p.tier} className={`rounded border border-line text-center ${pick === p.tier ? 'bg-white/5' : ''}`}>
                  {TIER_RANK[p.tier] >= TIER_RANK[f.from] ? '✓' : <span className="text-subtle">–</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** [W] GGPass subscribe (mock): sign in → choose plan → back to where the viewer was. */
export function Subscribe() {
  const [q] = useSearchParams();
  const next = q.get('next') || '/';
  const { set, tier } = useSession();
  const nav = useNavigate();
  const [step, setStep] = useState<'login' | 'plan' | 'done'>('login');
  const [pick, setPick] = useState<Tier>((q.get('plan') as Tier) || (tier === 'standard' ? 'platinum' : 'standard'));
  const [email, setEmail] = useState('');
  const plan = PLANS.find((p) => p.tier === pick)!;

  return (
    <div className="grid min-h-dvh place-items-center bg-[#0c0f14] px-4 py-10">
      <div className="w-full max-w-lg rounded-lg border border-[#2a3140] bg-[#121722] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="text-[18px] font-black tracking-tight">GG<span className="text-[#4ea1ff]">PASS</span></div>
          <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold tracking-widest">DEMO · NOT REAL</span>
        </div>
        <ol className="mt-4 flex gap-2 text-[11px] text-subtle">
          {['Sign in', 'Plan', 'Done'].map((s, i) => (
            <li key={s} className={`flex-1 border-t-2 pt-1 ${i <= ['login', 'plan', 'done'].indexOf(step) ? 'border-[#4ea1ff] text-white' : 'border-[#2a3140]'}`}>{s}</li>
          ))}
        </ol>

        {step === 'login' && (
          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setStep('plan');
            }}
          >
            <h1 className="text-[20px] font-bold">Sign in to subscribe to WSOP TV</h1>
            <p className="text-[13px] text-muted">One GGPass account for WSOP TV, WSOP+ and GGPoker. Any email works here; nothing is sent.</p>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="you@example.com" className="w-full rounded border border-[#2a3140] bg-black/30 px-3 py-2.5 text-[14px] outline-none focus:border-[#4ea1ff]" />
            <input type="password" required placeholder="Password" className="w-full rounded border border-[#2a3140] bg-black/30 px-3 py-2.5 text-[14px] outline-none focus:border-[#4ea1ff]" />
            <button className="w-full rounded bg-[#4ea1ff] py-2.5 text-[14px] font-bold text-black">Continue</button>
            <Link to={next} className="block text-center text-[12px] text-muted hover:text-white">Not now — back to WSOP TV</Link>
          </form>
        )}

        {step === 'plan' && (
          <div className="mt-6">
            <h1 className="text-[20px] font-bold">Choose your plan</h1>
            <p className="mb-3 text-[13px] text-muted">Billed by WSOP+. Cancel anytime.</p>
            <PlanTable pick={pick} onPick={(t) => t !== 'free' && setPick(t)} />
            <button
              className="mt-4 w-full rounded bg-gold py-2.5 text-[14px] font-bold text-black"
              onClick={() => {
                set({ tier: pick });
                setStep('done');
              }}
            >
              Start {plan.name} · {plan.price}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="mt-6 text-center">
            <div className="text-[40px]">✓</div>
            <h1 className="text-[20px] font-bold">You’re on {plan.name}</h1>
            <p className="mt-1 text-[13px] text-muted">Taking you back to where you were.</p>
            <button className="mt-4 w-full rounded bg-white py-2.5 text-[14px] font-bold text-black" onClick={() => nav(next, { replace: true })}>
              Back to WSOP TV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
