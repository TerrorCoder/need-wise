import { FormEvent, useEffect, useMemo, useState } from 'react';
import { captureOrder, createOrder, getRecommendations } from './services/api';
import type { Priority, RecommendationItem, RecommendationResult, RetailerAllocation } from './types';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const formatMoney = (cents: number) => money.format(cents / 100);
const priorities: Array<{ value: Priority; label: string; hint: string }> = [
  { value: 'affordability', label: 'Best value', hint: 'Stretch the budget' },
  { value: 'durability', label: 'Durability', hint: 'Built to last' },
  { value: 'portability', label: 'Portability', hint: 'Easy to carry' }
];
const checkoutStorageKey = 'needwise-checkout-summary';
type CheckoutSummary = { orderId: string; totalCents: number; allocation: RetailerAllocation[] };

function allocationFor(items: RecommendationItem[]) {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(item.merchant, (totals.get(item.merchant) ?? 0) + item.priceCents);
  return [...totals].map(([merchant, amountCents]) => ({ merchant, amountCents })).sort((a, b) => a.merchant.localeCompare(b.merchant));
}

function ProductCard({ item, alternatives, live, expanded, onExpand, onRemove, onReplace }: {
  item: RecommendationItem;
  alternatives: RecommendationItem[];
  live: boolean;
  expanded: boolean;
  onExpand: () => void;
  onRemove: () => void;
  onReplace: () => void;
}) {
  const description = item.description || 'No detailed description was supplied by the catalogue.';
  return <article className="product-card">
    {item.imageUrl ? <img className="product-image" src={item.imageUrl} alt={`${item.name} product image`} /> : <div className="product-icon" aria-hidden="true">◇</div>}
    <div className="product-copy">
      <div className="product-title-row"><div><h4>{item.productUrl ? <a href={item.productUrl} target="_blank" rel="noreferrer">{item.name}</a> : item.name}</h4><span>{item.category}</span></div><strong className="card-price">{formatMoney(item.priceCents)}</strong></div>
      <p className={expanded ? '' : 'description-collapsed'}>{description}</p>
      {description.length > 150 && <button className="text-button" type="button" onClick={onExpand} aria-expanded={expanded}>{expanded ? 'Show less' : 'Read description'}</button>}
      <p className="reason"><b>Why this:</b> {item.reason}</p>
      <small>{live ? `Sold by ${item.merchant}${item.availability ? ` · ${item.availability === 'InStock' ? 'In stock' : item.availability}` : ''}` : `Sample product · ${item.merchant}`}</small>
    </div>
    <div className="product-action">
      {live && item.productUrl && <a className="retailer-link" href={item.productUrl} target="_blank" rel="noreferrer">View retailer</a>}
      <button className="secondary-button" type="button" onClick={onReplace} disabled={!alternatives.length} aria-label={alternatives.length ? `Replace ${item.name} with another relevant product` : `No replacement is available for ${item.name}`}>{alternatives.length ? 'Replace item' : 'No alternative'}</button>
      <button className="remove-button" type="button" onClick={onRemove} aria-label={`Remove ${item.name}`}>Remove</button>
    </div>
  </article>;
}

export default function App() {
  const initialParams = new URLSearchParams(location.search);
  const isReturning = initialParams.get('payment') === 'return' && Boolean(initialParams.get('token'));
  const [budget, setBudget] = useState('75');
  const [requirements, setRequirements] = useState('Study essentials for a university student');
  const [selectedPriorities, setPriorities] = useState<Priority[]>(['affordability']);
  const [mode, setMode] = useState<'live' | 'demo'>('live');
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [basket, setBasket] = useState<RecommendationItem[]>([]);
  const [alternatives, setAlternatives] = useState<Record<string, RecommendationItem[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [paymentSummary, setPaymentSummary] = useState<CheckoutSummary | null>(null);
  const [busy, setBusy] = useState(isReturning);
  const [message, setMessage] = useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(() => initialParams.get('payment') === 'cancelled' ? { kind: 'info', text: 'Payment was cancelled. Your basket has not been charged.' } : null);
  const budgetCents = Math.round(Number(budget) * 100);
  const total = useMemo(() => basket.reduce((sum, item) => sum + item.priceCents, 0), [basket]);
  const remaining = Math.max(0, budgetCents - total);
  const percent = budgetCents > 0 ? Math.min(100, (total / budgetCents) * 100) : 0;
  const retailerAllocation = useMemo(() => allocationFor(basket), [basket]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const payment = params.get('payment');
    const token = params.get('token');
    if (payment === 'return' && token) {
      let stored: CheckoutSummary | null = null;
      try { stored = JSON.parse(sessionStorage.getItem(checkoutStorageKey) ?? 'null') as CheckoutSummary | null; } catch { stored = null; }
      captureOrder(token).then((capture) => {
        const verified = capture.captured && capture.amountCents !== undefined && stored?.orderId === token && stored.totalCents === capture.amountCents;
        if (verified && stored) {
          setPaymentSummary(stored);
          setMessage({ kind: 'success', text: `Test payment confirmed — order ${token}.` });
          sessionStorage.removeItem(checkoutStorageKey);
        } else {
          setMessage({ kind: 'error', text: capture.captured ? 'PayPal captured the order, but its verified amount did not match this browser checkout summary.' : `Payment status: ${capture.status}.` });
        }
      }).catch((error: Error) => setMessage({ kind: 'error', text: error.message })).finally(() => { setBusy(false); history.replaceState({}, '', location.pathname); });
    } else if (payment === 'cancelled') history.replaceState({}, '', location.pathname);
  }, []);

  const togglePriority = (priority: Priority) => setPriorities((current) => current.includes(priority) ? current.filter((item) => item !== priority) : [...current, priority]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!Number.isFinite(budgetCents) || budgetCents < 100) { setMessage({ kind: 'error', text: 'Enter a budget of at least $1.' }); return; }
    setBusy(true);
    try {
      const data = await getRecommendations(budgetCents, requirements, selectedPriorities, mode);
      setResult(data); setBasket(data.items); setAlternatives(data.alternatives ?? {}); setExpanded(new Set());
      if (!data.items.length) setMessage({ kind: 'info', text: data.notice.includes('fits') ? 'No relevant products fit this budget. Try increasing it or broadening your need.' : 'No relevant products were found for this need.' });
    } catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Recommendation failed.' }); }
    finally { setBusy(false); }
  }
  function removeItem(id: string) {
    setBasket((current) => current.filter((item) => item.id !== id));
    setMessage({ kind: 'info', text: 'Item removed. Your remaining budget has been updated.' });
  }
  function replaceItem(item: RecommendationItem) {
    const candidate = alternatives[item.id]?.find((alternative) => !basket.some((selected) => selected.id === alternative.id));
    if (!candidate) { setMessage({ kind: 'info', text: 'No suitable replacement is available within the remaining budget.' }); return; }
    setBasket((current) => current.map((selected) => selected.id === item.id ? candidate : selected));
    setAlternatives((current) => ({ ...current, [candidate.id]: current[item.id] ?? [] }));
    setMessage({ kind: 'success', text: `${item.name} was replaced with ${candidate.name}.` });
  }
  async function checkout() {
    if (!result || !basket.length || total > budgetCents || (result.mode === 'live' && !result.checkoutToken)) return;
    setBusy(true); setMessage(null);
    try {
      const order = await createOrder(basket.map((item) => item.id), result.mode === 'live' ? result.checkoutToken : undefined);
      sessionStorage.setItem(checkoutStorageKey, JSON.stringify({ orderId: order.orderId, totalCents: order.totalCents, allocation: order.allocation } satisfies CheckoutSummary));
      location.assign(order.approveUrl);
    }
    catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Checkout failed.' }); setBusy(false); }
  }

  return <>
    <header className="site-header"><a className="brand" href="#top" aria-label="NeedWise home"><span className="brand-mark">N</span><span>NeedWise</span></a><nav aria-label="Main navigation"><a href="#how">How it works</a><a href="#planner">Start shopping</a></nav></header>
    <main id="main">
      <section className="hero" id="top"><div className="hero-copy"><p className="eyebrow">Thoughtful choices. Clear limits.</p><h1>Make every dollar<br/><em>go further.</em></h1><p className="hero-lede">Search real products across retailers, compare trade-offs, and keep a firm budget. NeedWise recommends; you make the final call.</p><a className="primary-link" href="#planner">Start discovering <span aria-hidden="true">→</span></a><p className="trust-line"><span>✓ Budget enforced in code</span><span>✓ Retailer links stay visible</span></p></div><div className="hero-card" aria-label="Example budget overview"><div className="mini-top"><span>Live catalogue search</span><span className="positive">On budget</span></div><strong>$61.96</strong><span>of $75.00 planned</span><div className="mini-bar"><i style={{ width: '83%' }}/></div><div className="mini-remaining"><span>Still available</span><b>$13.04</b></div></div></section>
      <section className="steps" id="how"><p className="eyebrow">A calmer way to shop</p><h2>Useful choices. Clear limits.</h2><div className="step-grid"><article><span>01</span><h3>Tell us what you need</h3><p>Describe what you are shopping for and what matters most to you.</p></article><article><span>02</span><h3>Compare your options</h3><p>Review suitable products, prices, sellers, and the reasons behind each suggestion.</p></article><article><span>03</span><h3>Build your basket</h3><p>Remove or replace items, check the total, and continue when the basket feels right.</p></article></div></section>
      <section className="planner" id="planner">
        <div className="section-heading"><div><p className="eyebrow">Plan your basket</p><h2>What are you shopping for?</h2></div></div>
        <div className="planner-grid">
          <form className="request-card" onSubmit={submit}><fieldset className="mode-switch"><legend>Choose where to shop</legend><label className={mode === 'live' ? 'mode active' : 'mode'}><input type="radio" name="mode" checked={mode === 'live'} onChange={() => setMode('live')}/><b>Shop retailer products</b><small>Current listings and prices</small></label><label className={mode === 'demo' ? 'mode active' : 'mode'}><input type="radio" name="mode" checked={mode === 'demo'} onChange={() => setMode('demo')}/><b>Browse sample products</b><small>Practice with a sample basket</small></label></fieldset><label htmlFor="budget">Maximum budget <span>USD</span></label><div className="money-input"><span>$</span><input id="budget" inputMode="decimal" type="number" min="1" max="10000" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} required/></div><label htmlFor="requirements">What do you need?</label><textarea id="requirements" maxLength={500} value={requirements} onChange={(event) => setRequirements(event.target.value)} required/><fieldset><legend>What matters most?</legend><div className="priority-grid">{priorities.map((priority) => <label className={selectedPriorities.includes(priority.value) ? 'priority active' : 'priority'} key={priority.value}><input type="checkbox" checked={selectedPriorities.includes(priority.value)} onChange={() => togglePriority(priority.value)}/><b>{priority.label}</b><small>{priority.hint}</small></label>)}</div></fieldset><button className="primary-button" disabled={busy}>{busy ? 'Finding suitable products…' : mode === 'live' ? 'Find products' : 'Build a sample basket'} <span aria-hidden="true">→</span></button><p className="fine-print">{mode === 'live' ? 'Prices and availability may change at the retailer.' : 'Sample products let you try the basket and test checkout without buying retailer items.'}</p></form>
          <div className="results" aria-live="polite" aria-busy={busy}>
            {message && <div className={`notice ${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</div>}
            {paymentSummary && <section className="checkout-review confirmation"><h3>Test payment confirmed</h3><p>PayPal order <b>{paymentSummary.orderId}</b> was confirmed for <b>{formatMoney(paymentSummary.totalCents)}</b>.</p>{paymentSummary.allocation.map((entry) => <div className="allocation-row" key={entry.merchant}><span>{entry.merchant}</span><strong>{formatMoney(entry.amountCents)}</strong></div>)}<p>This was a test payment. No money was sent to the listed retailers.</p></section>}
            {busy && <div className="loading-state" role="status">Finding suitable products and checking your budget…</div>}
            {!busy && !result && !message && <div className="empty-state"><span aria-hidden="true">⌁</span><h3>Your suggestions will appear here</h3><p>Enter your budget and describe what you need to start building your basket.</p></div>}
            {!busy && result && <>
              <div className="result-heading"><div><p className="eyebrow">{result.mode === 'live' ? 'Retailer products' : 'Sample basket'}</p><h3>{result.summary}</h3></div>{basket.length > 0 && <a className="checkout-jump" href="#checkout-review">Review basket &amp; checkout</a>}</div>
              <p className="result-notice">{result.mode === 'live' ? 'Check the retailer page before buying; prices, taxes, delivery costs, and availability can change.' : 'These are sample products for trying NeedWise and its test checkout.'}</p>
              {basket.length ? basket.map((item) => <ProductCard key={item.id} item={item} alternatives={alternatives[item.id] ?? []} live={result.mode === 'live'} expanded={expanded.has(item.id)} onExpand={() => setExpanded((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} onRemove={() => removeItem(item.id)} onReplace={() => replaceItem(item)} />) : <div className="empty-state compact"><h3>Your basket is empty</h3><p>Run the search again to build a new focused basket.</p></div>}
              <div className="budget-summary"><div className="budget-summary-heading"><span>Budget summary</span><b>{basket.length} selected</b></div><div className="budget-row"><span>Maximum budget</span><strong>{formatMoney(budgetCents)}</strong></div><div className="budget-row"><span>Selected total</span><strong>{formatMoney(total)}</strong></div><div className="progress" role="progressbar" aria-label="Budget used" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${percent}%` }}/></div><div className="budget-row remaining"><span>Remaining</span><strong>{formatMoney(remaining)}</strong></div><p>Catalogue prices are not final retailer charges; taxes and shipping may apply.</p></div>
              {basket.length > 0 && <section className="checkout-review" id="checkout-review"><h3>Review your checkout</h3>{retailerAllocation.map((entry) => <div className="allocation-row" key={entry.merchant}><span>{entry.merchant}</span><strong>{formatMoney(entry.amountCents)}</strong></div>)}<div className="allocation-row allocation-total"><span>Basket total</span><strong>{formatMoney(total)}</strong></div><p>Amounts are grouped by retailer so you can see where each part of your basket belongs.</p><button className="paypal-button" type="button" onClick={checkout} disabled={busy || total > budgetCents || (result.mode === 'live' && !result.checkoutToken)}>Continue with PayPal</button><p>This is a test checkout. No real money will be charged or sent to retailers.</p></section>}
            </>}
          </div>
        </div>
      </section>
    </main>
    <footer><div className="brand"><span className="brand-mark">N</span><span>NeedWise</span></div><p>Thoughtful shopping that respects your budget.</p><small>Review retailer details before making a purchase.</small></footer>
  </>;
}
