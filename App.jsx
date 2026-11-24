import { useEffect, useMemo, useState } from 'react'
import './App.css'

const icons = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  receipt: <><path d="M4 3h16v18l-3-2-3 2-3-2-3 2-4-2z" /><path d="M8 8h8M8 12h8M8 16h4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 13.6a7.5 7.5 0 0 0 0-3.2l1.5-1.1-1.5-2.6-1.7.6a7 7 0 0 0-2.7-1.5L14.3 4h-3l-.4 1.8a7 7 0 0 0-2.7 1.5l-1.7-.6L5 9.3l1.5 1.1a7.5 7.5 0 0 0 0 3.2L5 14.7l1.5 2.6 1.7-.6a7 7 0 0 0 2.7 1.5l.4 1.8h3l.4-1.8a7 7 0 0 0 2.7-1.5l1.7.6 1.5-2.6z" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  minus: <path d="M5 12h14" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  print: <><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v7H7zM17 11h.01" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  fork: <><path d="M6 3v6a3 3 0 0 0 6 0V3M9 3v18M18 3v5a3 3 0 0 1-3 3h-1v10" /></>,
}

function Icon({ name, size = 20 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

function money(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

function readOrders() {
  try {
    return JSON.parse(localStorage.getItem('ember-orders') || '[]')
  } catch {
    return []
  }
}

function App() {
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [activeCategory, setActiveCategory] = useState('All items')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [customer, setCustomer] = useState('')
  const [table, setTable] = useState('Takeaway')
  const [payment, setPayment] = useState('Card')
  const [tipRate, setTipRate] = useState(0.1)
  const [receipt, setReceipt] = useState(null)
  const [orders, setOrders] = useState(readOrders)

  useEffect(() => {
    fetch('/db.json')
      .then((response) => {
        if (!response.ok) throw new Error('Menu data could not be loaded.')
        return response.json()
      })
      .then(setData)
      .catch(() => setLoadError('The menu could not be loaded. Check that public/db.json is available.'))
  }, [])

  const currency = data?.currency || 'USD'
  const filteredMenu = useMemo(() => {
    if (!data) return []
    const query = search.trim().toLowerCase()
    return data.menu.filter((item) => {
      const inCategory = activeCategory === 'All items' || item.category === activeCategory
      return inCategory && (!query || `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query))
    })
  }, [activeCategory, data, search])

  const subtotal = cart.reduce((total, entry) => total + entry.price * entry.quantity, 0)
  const tax = subtotal * (data?.taxRate ?? 0)
  const tip = subtotal * tipRate
  const total = subtotal + tax + tip
  const itemCount = cart.reduce((count, entry) => count + entry.quantity, 0)
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

  function addToCart(item) {
    setCart((current) => {
      const existing = current.find((entry) => entry.id === item.id)
      return existing
        ? current.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry)
        : [...current, { ...item, quantity: 1 }]
    })
  }

  function changeQuantity(id, amount) {
    setCart((current) => current
      .map((entry) => entry.id === id ? { ...entry, quantity: entry.quantity + amount } : entry)
      .filter((entry) => entry.quantity > 0))
  }

  function completeOrder(event) {
    event.preventDefault()
    if (!cart.length) return
    const newOrder = {
      id: `E${String(orders.length + 1).padStart(6, '0')}`,
      customer: customer.trim() || 'Walk-in guest',
      table,
      payment,
      items: cart,
      subtotal,
      tax,
      tip,
      total,
      createdAt: new Date().toISOString(),
    }
    const nextOrders = [newOrder, ...orders].slice(0, 30)
    localStorage.setItem('ember-orders', JSON.stringify(nextOrders))
    setOrders(nextOrders)
    setReceipt(newOrder)
  }

  function startNextOrder() {
    setReceipt(null)
    setCart([])
    setCustomer('')
    setTable('Takeaway')
    setTipRate(0.1)
    setPayment('Card')
  }

  return (
    <div className="pos-shell">
      <aside className="rail" aria-label="Main navigation">
        <a className="brand-mark" href="#home" aria-label="Ember and Olive home"><Icon name="fork" size={22} /></a>
        <div className="rail-links">
          <button className="rail-button is-active" aria-label="New order" title="New order"><Icon name="grid" /></button>
          <button className="rail-button" aria-label="Receipts" title={`Receipts (${orders.length})`}><Icon name="receipt" /><span className="rail-count">{orders.length || ''}</span></button>
          <button className="rail-button" aria-label="Order history" title="Order history"><Icon name="clock" /></button>
        </div>
        <button className="rail-button rail-settings" aria-label="Settings" title="Settings"><Icon name="settings" /></button>
        <div className="staff-avatar" title="Maya Chen">MC</div>
      </aside>

      <main className="workspace" id="home">
        <header className="topbar">
          <div className="wordmark"><span className="wordmark-icon"><Icon name="fork" size={17} /></span><span>EMBER <i>&</i> OLIVE</span><span className="counter-label">COUNTER</span></div>
          <div className="topbar-meta"><span className="open-indicator"><span /> Service open</span><span className="topbar-divider" /><span>{today}</span></div>
        </header>

        <section className="menu-area" aria-label="Food menu">
          <div className="page-heading">
            <div><p className="eyebrow">TABLE SERVICE <span>·</span> FRONT COUNTER</p><h1>Build an order</h1><p className="heading-note">A good meal starts with a good choice.</p></div>
            <div className="order-stat"><span className="stat-dot" /><span>Orders today</span><strong>{orders.length + 24}</strong></div>
          </div>

          <div className="menu-toolbar">
            <div className="category-tabs" role="tablist" aria-label="Menu categories">
              {(data?.categories || []).map((category) => <button key={category} role="tab" aria-selected={activeCategory === category} className={activeCategory === category ? 'category-tab selected' : 'category-tab'} onClick={() => setActiveCategory(category)}>{category}</button>)}
            </div>
            <label className="search-box"><Icon name="search" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a dish..." aria-label="Search menu" /><kbd>/</kbd></label>
          </div>

          {loadError ? <div className="menu-message error-message">{loadError}</div> : !data ? <div className="menu-message">Setting the table<span className="loading-dots">...</span></div> : filteredMenu.length === 0 ? <div className="menu-message">No dishes match that search. Try another name or category.</div> : (
            <div className="menu-grid">
              {filteredMenu.map((item, index) => <button className="menu-card" key={item.id} onClick={() => addToCart(item)} style={{ '--card-delay': `${index * 45}ms` }}>
                <span className="dish-image-wrap"><img className="dish-image" src={item.image} alt="" loading="lazy" /><span className="add-dish" aria-hidden="true"><Icon name="plus" size={17} /></span>{item.badge && <span className="dish-badge">{item.badge}</span>}</span>
                <span className="dish-info"><span className="dish-category">{item.category}</span><span className="dish-name">{item.name}</span><span className="dish-description">{item.description}</span><span className="dish-price">{money(item.price, currency)}</span></span>
              </button>)}
            </div>
          )}
          <footer className="menu-footer"><span>Made fresh, served with care.</span><span>Menu prices in {currency}</span></footer>
        </section>
      </main>

      <aside className="order-panel" aria-label="Current order">
        <div className="order-panel-head"><div><p className="eyebrow">CURRENT TICKET</p><h2>Your order <span className="item-count">{itemCount}</span></h2></div><button className="icon-button clear-button" onClick={() => setCart([])} disabled={!cart.length} aria-label="Clear order" title="Clear order"><Icon name="close" size={18} /></button></div>
        <form className="ticket-form" onSubmit={completeOrder}>
          <label className="field-label">GUEST NAME<input value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Add a name (optional)" /></label>
          <label className="field-label">ORDER TYPE<select value={table} onChange={(event) => setTable(event.target.value)}><option>Takeaway</option><option>Dine in · Table 01</option><option>Dine in · Table 02</option><option>Dine in · Table 03</option><option>Pickup</option></select></label>

          <div className="ticket-items" aria-live="polite">
            {!cart.length ? <div className="empty-ticket"><span className="empty-illustration"><Icon name="receipt" size={23} /></span><strong>Your ticket is waiting</strong><span>Choose something delicious<br />to get things started.</span></div> : cart.map((entry) => <div className="ticket-item" key={entry.id}>
              <img src={entry.image} alt="" className="ticket-thumb" />
              <div className="ticket-item-info"><strong>{entry.name}</strong><span>{money(entry.price, currency)} each</span><div className="quantity-control"><button type="button" onClick={() => changeQuantity(entry.id, -1)} aria-label={`Remove one ${entry.name}`}><Icon name="minus" size={13} /></button><span>{entry.quantity}</span><button type="button" onClick={() => changeQuantity(entry.id, 1)} aria-label={`Add one ${entry.name}`}><Icon name="plus" size={13} /></button></div></div>
              <strong className="line-total">{money(entry.price * entry.quantity, currency)}</strong>
            </div>)}
          </div>

          <div className="tip-row"><span>Add a little extra</span><div className="tip-options" aria-label="Tip amount">{[0, 0.1, 0.15, 0.2].map((rate) => <button type="button" key={rate} aria-pressed={tipRate === rate} className={tipRate === rate ? 'tip-option active' : 'tip-option'} onClick={() => setTipRate(rate)}>{rate === 0 ? 'None' : `${rate * 100}%`}</button>)}</div></div>
          <div className="totals"><div><span>Subtotal</span><span>{money(subtotal, currency)}</span></div><div><span>Tax <small>({((data?.taxRate ?? 0) * 100).toFixed(2)}%)</small></span><span>{money(tax, currency)}</span></div>{tipRate > 0 && <div><span>Tip <small>({tipRate * 100}%)</small></span><span>{money(tip, currency)}</span></div>}<div className="total-line"><strong>Total due</strong><strong>{money(total, currency)}</strong></div></div>
          <div className="payment-method"><span className="field-label-text">PAYMENT METHOD</span><div className="payment-options">{['Card', 'Cash'].map((method) => <button type="button" key={method} className={payment === method ? 'payment-option selected' : 'payment-option'} aria-pressed={payment === method} onClick={() => setPayment(method)}><span className={`payment-symbol ${method.toLowerCase()}`}>{method === 'Card' ? '▤' : '$'}</span>{method}</button>)}</div></div>
          <button className="charge-button" type="submit" disabled={!cart.length}><span>Charge {money(total, currency)}</span><Icon name="chevron" size={18} /></button>
          <p className="secure-note"><Icon name="check" size={13} /> Sale recorded in this register</p>
        </form>
      </aside>

      {receipt && <div className="modal-backdrop" role="presentation"><section className="receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-title"><button className="icon-button modal-close" onClick={startNextOrder} aria-label="Close receipt"><Icon name="close" /></button><div className="receipt-success"><span><Icon name="check" size={24} /></span></div><p className="eyebrow">PAYMENT COMPLETE</p><h2 id="receipt-title">That's a wrap.</h2><p className="receipt-subtitle">Thanks, {receipt.customer}. Your order is in good hands.</p><div className="receipt-number"><span>ORDER</span><strong>#{receipt.id}</strong></div><div className="receipt-summary">{receipt.items.map((item) => <div key={item.id}><span>{item.quantity} × {item.name}</span><span>{money(item.price * item.quantity, currency)}</span></div>)}<div><span>Subtotal</span><span>{money(receipt.subtotal, currency)}</span></div><div><span>Tax</span><span>{money(receipt.tax, currency)}</span></div>{receipt.tip > 0 && <div><span>Tip</span><span>{money(receipt.tip, currency)}</span></div>}<div className="receipt-total"><strong>Total paid</strong><strong>{money(receipt.total, currency)}</strong></div></div><p className="receipt-payment">Paid by {receipt.payment} · {receipt.table}</p><div className="receipt-actions"><button className="print-button" onClick={() => window.print()}><Icon name="print" size={17} /> Print receipt</button><button className="new-order-button" onClick={startNextOrder}>Start next order <Icon name="chevron" size={17} /></button></div></section></div>}
    </div>
  )
}

export default App