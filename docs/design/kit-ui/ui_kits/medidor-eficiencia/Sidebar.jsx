function Sidebar({ tab, setTab, onLogout }) {
  const { Icon } = window.DS;
  const items = [
    { id: 'home', label: 'Inicio', icon: 'home' },
    { id: 'activities', label: 'Atividades', icon: 'clock' },
    { id: 'categories', label: 'Categorias', icon: 'tag' },
    { id: 'reports', label: 'Relatorios', icon: 'star' },
  ];
  return (
    <div style={{ width: '190px', flex: 'none', display: 'flex', flexDirection: 'column', gap: '6px', padding: '20px 12px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', padding: '0 10px 16px' }}>Medidor</div>
      {items.map(it => (
        <button key={it.id} onClick={() => setTab(it.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', fontFamily: 'var(--font-body)',
            fontSize: '16px', background: tab === it.id ? 'var(--accent-blue-soft)' : 'transparent', border: 'none',
            borderRadius: '10px 6px 12px 6px', color: 'var(--ink)', cursor: 'pointer', textAlign: 'left',
          }}>
          <Icon name={it.icon} size={18} /> {it.label}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'transparent', border: 'none', color: 'var(--ink-soft)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '16px' }}>
        <Icon name="logout" size={18} /> Sair
      </button>
    </div>
  );
}
