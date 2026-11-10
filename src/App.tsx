import { FormEvent, useEffect, useMemo, useState } from 'react';
import { captureOrder, createOrder, getRecommendations, getStatus } from './services/api';
import type { AppStatus, Priority, RecommendationItem, RecommendationResult } from './types';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const formatMoney = (cents: number) => money.format(cents / 100);
const priorities: Array<{ value: Priority; label: string; hint: string }> = [
  { value: 'affordability', label: 'Best value', hint: 'Stretch the budget' },
  { value: 'durability', label: 'Durability', hint: 'Built to last' },
  { value: 'portability', label: 'Portability', hint: 'Easy to carry' }
];

export default function App() {
  const initialParams = new URLSearchParams(location.search);
  const isReturning = initialParams.get('payment') === 'return' && Boolean(initialParams.get('token'));
  const [budget, setBudget] = useState('75');
  const [requirements, setRequirements] = useState('Study essentials for a university student');
  const [selectedPriorities, setPriorities] = useState<Priority[]>(['affordability']);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [basket, setBasket] = useState<RecommendationItem[]>([]);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [busy, setBusy] = useState(isReturning);
  const [message, setMessage] = useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(() => initialParams.get('payment') === 'cancelled' ? { kind: 'info', text: 'Payment was cancelled. Your basket has not been charged.' } : null);

  const budgetCents = Math.round(Number(budget) * 100);
  const total = useMemo(() => basket.reduce((sum, item) => sum + item.priceCents, 0), [basket]);
  const remaining = Math.max(0, budgetCents - total);
  const percent = budgetCents > 0 ? Math.min(100, (total / budgetCents) * 100) : 0;

  useEffect(() => { getStatus().then(setStatus).catch(() => setStatus(null)); }, []);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const payment = params.get('payment');
    const token = params.get('token');
    if (payment === 'cancelled') {
      history.replaceState({}, '', location.pathname);
    } else if (payment === 'return' && token) {
      captureOrder(token).then((capture) => setMessage({ kind: capture.captured ? 'success' : 'error', text: capture.captured ? `Sandbox payment verified — order ${token}.` : `Payment status: ${capture.status}.` })).catch((error: Error) => setMessage({ kind: 'error', text: error.message })).finally(() => { setBusy(false); history.replaceState({}, '', location.pathname); });
    }
  }, []);

  const togglePriority = (priority: Priority) => setPriorities((current) => current.includes(priority) ? current.filter((item) => item !== priority) : [...current, priority]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!Number.isFinite(budgetCents) || budgetCents < 100) return setMessage({ kind: 'error', text: 'Enter a budget of at least $1.' });
    setBusy(true);
    try {
      const data = await getRecommendations(budgetCents, requirements, selectedPriorities);
      setResult(data); setBasket(data.items);
      if (!data.items.length) setMessage({ kind: 'info', text: 'No suitable basket fits that budget. Try increasing it or changing your request.' });
    } catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Recommendation failed.' }); }
    finally { setBusy(false); }
  }

  async function checkout() {
    if (!basket.length || total > budgetCents) return;
    setBusy(true); setMessage(null);
    try {
      const order = await createOrder(basket.map((item) => item.id));
      location.assign(order.approveUrl);
    } catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Checkout failed.' }); setBusy(false); }
  }

  return <>
    <header className="site-header"><a className="brand" href="#top" aria-label="NeedWise home"><span className="brand-mark">N</span><span>NeedWise</span></a><nav aria-label="Main navigation"><a href="#how">How it works</a><a href="#planner">Plan a basket</a></nav><span className="demo-pill">Sandbox demo</span></header>
    <main id="main">
      <section className="hero" id="top"><div className="hero-copy"><p className="eyebrow">Thoughtful choices. Clear limits.</p><h1>Make every dollar<br/><em>go further.</em></h1><p className="hero-lede">Tell us what you need and what matters most. NeedWise builds a practical basket that stays inside your budget—you always make the final call.</p><a className="primary-link" href="#planner">Build my basket <span aria-hidden="true">→</span></a><p className="trust-line"><span>✓ Budget enforced in code</span><span>✓ You approve every payment</span></p></div><div className="hero-card" aria-label="Example budget overview"><div className="mini-top"><span>Weekly essentials</span><span className="positive">On budget</span></div><strong>{formatMoney(61.96)}</strong><span>of $75.00 planned</span><div className="mini-bar"><i style={{ width: '83%' }}/></div><div className="mini-items"><span>Study lamp</span><b>$18.99</b><span>Headphones</span><b>$24.99</b><span>Notebooks + bottle</span><b>$17.98</b></div><div className="mini-remaining"><span>Still available</span><b>$13.04</b></div></div></section>

      <section className="steps" id="how"><p className="eyebrow">A calmer way to shop</p><h2>Your priorities lead. AI helps.</h2><div className="step-grid"><article><span>01</span><h3>Set a firm limit</h3><p>Your maximum is a guardrail, not a suggestion. The server checks every total.</p></article><article><span>02</span><h3>Describe the need</h3><p>Use everyday language and choose what matters: value, durability, or portability.</p></article><article><span>03</span><h3>Review every choice</h3><p>Compare the reasoning, remove anything you do not want, then approve in PayPal Sandbox.</p></article></div></section>

      <section className="planner" id="planner"><div className="section-heading"><div><p className="eyebrow">Budget planner</p><h2>What are you shopping for?</h2></div><div className="provider-status" aria-label="Integration status"><span className={status?.ai ? 'dot live' : 'dot'}/>{status?.ai ? 'Workers AI ready' : 'AI fallback mode'} · Demo catalogue</div></div>
        <div className="planner-grid"><form className="request-card" onSubmit={submit}><label htmlFor="budget">Maximum budget <span>USD</span></label><div className="money-input"><span>$</span><input id="budget" inputMode="decimal" type="number" min="1" max="10000" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} required/></div><label htmlFor="requirements">What do you need?</label><textarea id="requirements" maxLength={500} value={requirements} onChange={(event) => setRequirements(event.target.value)} required/><fieldset><legend>What matters most?</legend><div className="priority-grid">{priorities.map((priority) => <label className={selectedPriorities.includes(priority.value) ? 'priority active' : 'priority'} key={priority.value}><input type="checkbox" checked={selectedPriorities.includes(priority.value)} onChange={() => togglePriority(priority.value)}/><b>{priority.label}</b><small>{priority.hint}</small></label>)}</div></fieldset><button className="primary-button" disabled={busy}>{busy ? 'Working…' : 'Find smart options'} <span aria-hidden="true">→</span></button><p className="fine-print">Recommendations use demonstration product data. No live prices or inventory are implied.</p></form>

          <div className="results" aria-live="polite" aria-busy={busy}>{message && <div className={`notice ${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</div>}{!result && !message && <div className="empty-state"><span aria-hidden="true">⌁</span><h3>Your basket will appear here</h3><p>Set your budget and describe what you need. We will explain each choice and show every trade-off.</p></div>}{result && <><div className="result-heading"><div><p className="eyebrow">Suggested basket</p><h3>{result.summary}</h3></div><span className="source-label">{result.source === 'workers-ai' ? 'AI explanation' : 'Rules-based explanation'}</span></div>{basket.map((item) => <article className="product" key={item.id}><div className="product-icon" aria-hidden="true">{item.category === 'technology' ? '⌁' : item.category === 'study' ? '✎' : '◇'}</div><div className="product-copy"><div><h4>{item.name}</h4><span>{item.category}</span></div><p>{item.description}</p><p className="reason"><b>Why this:</b> {item.reason}</p><small>Demo data · {item.merchant}</small></div><div className="product-action"><strong>{formatMoney(item.priceCents)}</strong><button type="button" onClick={() => setBasket((current) => current.filter((product) => product.id !== item.id))} aria-label={`Remove ${item.name}`}>Remove</button></div></article>)}<div className="budget-summary"><div className="budget-row"><span>Basket total</span><strong>{formatMoney(total)}</strong></div><div className="progress" role="progressbar" aria-label="Budget used" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${percent}%` }}/></div><div className="budget-row remaining"><span>Remaining</span><strong>{formatMoney(remaining)}</strong></div><button className="paypal-button" type="button" onClick={checkout} disabled={busy || !basket.length || total > budgetCents}>Continue to PayPal Sandbox</button><p>You will review and explicitly approve the payment on PayPal. No live funds are used.</p></div></>}</div></div>
      </section>
      <section className="values"><p className="eyebrow">Built for your wellbeing</p><h2>Less pressure. More clarity.</h2><div><article><b>01</b><h3>No hidden overspend</h3><p>Basket prices are recalculated server-side from trusted catalogue IDs.</p></article><article><b>02</b><h3>Honest product context</h3><p>Demo data and AI-generated explanations are always labelled clearly.</p></article><article><b>03</b><h3>Human approval</h3><p>NeedWise recommends; you decide. Checkout never starts silently.</p></article></div></section>
    </main>
    <footer><div className="brand"><span className="brand-mark">N</span><span>NeedWise</span></div><p>AI-powered shopping that respects your budget.</p><div><a href="https://github.com/TerrorCoder/need-wise">GitHub</a><a href="https://paypalaihackathon.devpost.com/">Hackathon</a></div><small>Built for the PayPal AI Hackathon 2026 · PayPal Sandbox only</small></footer>
  </>;
}
