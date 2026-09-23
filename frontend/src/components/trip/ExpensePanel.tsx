import { useState } from 'react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { categoryMeta } from '@/lib/labels';
import { Icon } from '@/components/ui/Icon';
import type { ExpenseSummary } from '@/api/types';

/**
 * The four headline figures plus the category split. Every number here comes
 * from the server — deriving them in the client would let them drift from the
 * aggregates shown on place pages.
 */
export function ExpensePanel({ summary }: { summary: ExpenseSummary }) {
  const [showTable, setShowTable] = useState(false);
  const categories = summary.byCategory.filter((entry) => entry.amount > 0);

  return (
    <section aria-labelledby="expense-heading">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id="expense-heading" className="text-[22px] font-bold tracking-tight">
          What it cost
        </h2>
        {categories.length > 0 && (
          <button
            onClick={() => setShowTable((value) => !value)}
            className="text-[13px] font-medium text-brand hover:underline"
          >
            {showTable ? 'Show chart' : 'Show table'}
          </button>
        )}
      </div>

      <StatRow summary={summary} />

      {categories.length > 0 ? (
        showTable ? (
          <CategoryTable summary={summary} />
        ) : (
          <>
            <StackedBar summary={summary} />
            <CategoryList summary={summary} />
          </>
        )
      ) : (
        <p className="mt-4 text-sm text-ink-soft">
          Entered as a single total, so there is no category breakdown for this trip.
        </p>
      )}
    </section>
  );
}

/** Four figures travellers actually compare, per-person-per-day last and loudest. */
function StatRow({ summary }: { summary: ExpenseSummary }) {
  const stats = [
    { label: 'Total', value: summary.total, hint: `${summary.travelerCount} travellers · ${summary.days} days` },
    { label: 'Per person', value: summary.perPerson, hint: null },
    { label: 'Per day', value: summary.perDay, hint: null },
    { label: 'Per person / day', value: summary.perPersonPerDay, hint: 'the comparable figure', highlight: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            'relative overflow-hidden rounded-2xl p-4 ring-1 ring-inset transition-shadow duration-300',
            stat.highlight
              ? 'bg-ember/10 ring-ember/25'
              : 'bg-surface ring-line-soft hover:shadow-card',
          )}
        >
          {stat.highlight && (
            <span className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-ember/20 blur-xl" aria-hidden />
          )}
          <p className="eyebrow mb-2">{stat.label}</p>
          <p className={cn(
            'tnum text-[22px] font-bold leading-none tracking-tight',
            stat.highlight && 'text-ember',
          )}>
            {money(stat.value, summary.currency)}
          </p>
          {stat.hint && <p className="mt-2 text-2xs text-ink-faint">{stat.hint}</p>}
        </div>
      ))}
    </div>
  );
}

/**
 * One stacked bar. Segments are separated by a 2px surface gap so adjacent
 * fills never blend, and each is hoverable for its exact figure.
 */
function StackedBar({ summary }: { summary: ExpenseSummary }) {
  const categories = summary.byCategory.filter((entry) => entry.amount > 0);

  return (
    <div className="mt-5">
      <div className="flex h-11 w-full gap-[2px] overflow-hidden rounded-xl" role="img"
        aria-label={categories.map((c) => `${categoryMeta(c.category).label} ${c.percentage}%`).join(', ')}>
        {categories.map((entry) => {
          const meta = categoryMeta(entry.category);
          return (
            <div
              key={entry.category}
              className="group relative h-full min-w-[3px] transition-[filter] duration-200 first:rounded-l-xl last:rounded-r-xl hover:brightness-115"
              style={{ width: `${entry.percentage}%`, background: meta.color }}
              title={`${meta.label} — ${money(entry.amount, summary.currency)} (${entry.percentage}%)`}
            >
              {/* Only label a segment wide enough to hold the text. */}
              {entry.percentage >= 12 && (
                <span className="absolute inset-0 flex items-center justify-center text-2xs font-semibold text-white tnum">
                  {Math.round(entry.percentage)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The direct-label layer the contrast rule requires, and the legend. */
function CategoryList({ summary }: { summary: ExpenseSummary }) {
  const categories = [...summary.byCategory]
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return (
    <ul className="mt-4 space-y-px">
      {categories.map((entry) => {
        const meta = categoryMeta(entry.category);
        return (
          <li key={entry.category} className="flex items-baseline gap-3 py-2">
            <span
              className="h-2.5 w-2.5 shrink-0 translate-y-[1px] rounded-sm"
              style={{ background: meta.color }}
              aria-hidden
            />
            <span className="text-sm font-medium">{meta.label}</span>
            <span className="tnum ml-auto text-sm font-semibold">
              {money(entry.amount, summary.currency)}
            </span>
            <span className="tnum w-11 shrink-0 text-right text-xs text-ink-faint">
              {entry.percentage}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function CategoryTable({ summary }: { summary: ExpenseSummary }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="eyebrow pb-2 font-normal">Category</th>
            <th className="eyebrow pb-2 text-right font-normal">Amount</th>
            <th className="eyebrow pb-2 text-right font-normal">Share</th>
          </tr>
        </thead>
        <tbody>
          {summary.byCategory.filter((e) => e.amount > 0).map((entry) => {
            const meta = categoryMeta(entry.category);
            return [
              <tr key={entry.category} className="border-b border-line-soft">
                <td className="py-2 font-medium">
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: meta.color }} aria-hidden />
                  {meta.label}
                </td>
                <td className="tnum py-2 text-right font-semibold">{money(entry.amount, summary.currency)}</td>
                <td className="tnum py-2 text-right text-ink-soft">{entry.percentage}%</td>
              </tr>,
              ...entry.subcategories.map((sub) => (
                <tr key={`${entry.category}-${sub.subcategory}`} className="border-b border-line-soft/60 text-ink-soft">
                  <td className="py-1.5 pl-6 text-[13px] capitalize">{sub.subcategory.toLowerCase().replace(/_/g, ' ')}</td>
                  <td className="tnum py-1.5 text-right text-[13px]">{money(sub.amount, summary.currency)}</td>
                  <td />
                </tr>
              )),
            ];
          })}
          <tr className="font-semibold">
            <td className="pt-2.5">Total</td>
            <td className="tnum pt-2.5 text-right">{money(summary.total, summary.currency)}</td>
            <td className="tnum pt-2.5 text-right text-ink-soft">100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Shown in place of the panel when the traveller kept their spending private. */
export function ExpenseHidden() {
  return (
    <section>
      <h2 className="mb-4 text-[22px] font-bold tracking-tight">What it cost</h2>
      <div className="flex items-start gap-3.5 rounded-card border border-dashed border-line bg-sunk/50 p-5">
        <Icon name="lock" size={18} className="mt-0.5 shrink-0 text-ink-faint" />
        <div>
          <p className="text-sm font-medium">Hidden by the traveller</p>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            This trip is shared publicly, but its spending is not. Everything else
            on the page is the full record.
          </p>
        </div>
      </div>
    </section>
  );
}
