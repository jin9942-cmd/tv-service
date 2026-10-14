import { useState } from 'react';
import { Link } from 'react-router-dom';
import { players } from '../data/mock';
import { count, money } from '../lib/format';
import { Avatar, BraceletCount, CountryCode, Page, Tabs, cx } from '../components/ui';

type Tab = 'poy' | 'money';

export function Rankings() {
  const [tab, setTab] = useState<Tab>('poy');
  const list = [...players].sort((a, b) => (tab === 'poy' ? b.poyPoints - a.poyPoints : b.earnings - a.earnings));
  return (
    <Page>
      <header>
        <p className="label text-gold">2026 season</p>
        <h1 className="mt-1 text-title font-black">Rankings</h1>
      </header>
      <div className="mt-5">
        <Tabs<Tab>
          label="Ranking type"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'poy', label: 'Player of the Year' },
            { value: 'money', label: 'All-time earnings' },
          ]}
        />
      </div>
      <p className="mt-3 text-sm text-muted">{tab === 'poy' ? 'Points from cashes and final tables across bracelet events this season.' : 'Career tournament earnings across all championship events.'}</p>
      <div className="mt-4 overflow-x-auto rounded-panel border border-line bg-surface" role="tabpanel">
        <table className="w-full min-w-[34rem] text-sm">
          <caption className="sr-only">{tab === 'poy' ? 'Player of the Year standings' : 'Earnings ranking'}</caption>
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="label w-14 px-4 py-3 text-subtle">
                Rank
              </th>
              <th scope="col" className="label px-4 py-3 text-subtle">
                Player
              </th>
              <th scope="col" className="label px-4 py-3 text-subtle">
                Bracelets
              </th>
              <th scope="col" className="label px-4 py-3 text-right text-subtle">
                {tab === 'poy' ? 'Points' : 'Earnings'}
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((p, i) => (
              <tr key={p.id} className={cx('border-b border-line last:border-0 hover:bg-surface-2', i < 3 && 'bg-gold/[0.03]')}>
                <td className={cx('px-4 py-3 text-lg font-black tnum', i < 3 ? 'text-gold' : 'text-subtle')}>{i + 1}</td>
                <td className="px-4 py-3">
                  <Link to={`/players/${p.id}`} className="flex items-center gap-3 font-semibold hover:text-gold-strong">
                    <Avatar name={p.name} hue={p.hue} size={32} />
                    {p.name} <CountryCode cc={p.cc} />
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <BraceletCount n={p.bracelets} size={15} />
                </td>
                <td className="px-4 py-3 text-right font-bold tnum">{tab === 'poy' ? count(p.poyPoints) : money(p.earnings)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
